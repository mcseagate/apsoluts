import { Invoice } from "../models/Invoice.js";
import { Counter } from "../models/Counter.js";
import { Payment } from "../models/Payment.js";
import { AuditEntry } from "../models/AuditEntry.js";
import { Project } from "../models/Project.js";
import { billingCurrency, businessProfile, defaultDueDays, invoiceLinkSecret, invoicePrefix, missingBusinessDetails } from "../lib/billingConfig.js";
import { assertChargeable, formatMoney, MoneyError, sumMinor } from "../lib/money.js";
import { badRequest, conflict, HttpError, notFound } from "../lib/http.js";
import { audit, history } from "../lib/audit.js";
import { addDays, dateString, text, todayUtc } from "../lib/validate.js";
import { invoiceLink } from "../lib/notify.js";
import { assertTermsReady } from "./projects.js";
import { closeOpenCheckouts } from "./payments.js";

// Invoices. The rules that matter most:
//   - an issued invoice's amount, currency, description and business details
//     never change; a correction voids it and issues a replacement;
//   - the amount always comes from the project's milestone, never from a request;
//   - a paid or voided invoice cannot be paid again.

// What the client and administrator see as the state. "overdue" is derived, not stored.
export function effectiveStatus(invoice, now = new Date()) {
  if (invoice.status === "unpaid" && invoice.dueDate < todayUtc(now)) return "overdue";
  return invoice.status;
}

export async function getInvoice(id) {
  const invoice = await Invoice.findById(id);
  if (!invoice) throw notFound("Invoice not found.");
  return invoice;
}

function describe(project, milestone) {
  const scope = project.scope.length > 600 ? `${project.scope.slice(0, 597)}...` : project.scope;
  return `${milestone.label} for "${project.title}".${scope ? `\n\n${scope}` : ""}`;
}

export async function createDraft(projectId, input) {
  const project = await Project.findById(projectId);
  if (!project) throw notFound("Project not found.");
  if (!project.acceptance || project.status !== "active") {
    throw conflict("NOT_ACCEPTED", "Record the client's acceptance of the scope before invoicing.");
  }
  if (project.currency !== billingCurrency()) {
    throw conflict("CURRENCY_MISMATCH", "This project's currency no longer matches the configured billing currency.");
  }
  const milestone = project.milestones.id(String(input.milestoneId));
  if (!milestone) throw notFound("Milestone not found on this project.");

  const dueDate = input.dueDate ? dateString(input.dueDate, "Due date") : addDays(todayUtc(), milestone.dueInDays ?? defaultDueDays());
  const note = text(input.note, "Note", { max: 500, optional: true, multiline: true });

  try {
    assertTermsReady(project);
    assertChargeable(milestone.amountMinor, project.currency);
    // Live invoices on this project may never add up to more than its price.
    const live = await Invoice.find({ projectId: project._id, active: true }, { amountMinor: 1 }).lean();
    const committed = sumMinor(live.map((i) => i.amountMinor));
    if (committed + milestone.amountMinor > project.priceMinor) {
      throw conflict("OVER_PRICE", "These invoices would add up to more than the project price.");
    }
  } catch (err) {
    if (err instanceof MoneyError) throw badRequest(err.message);
    throw err;
  }

  try {
    const invoice = await Invoice.create({
      projectId: project._id,
      milestoneId: milestone._id,
      clientName: project.clientName,
      clientEmail: project.clientEmail,
      projectTitle: project.title,
      milestoneLabel: milestone.label,
      description: describe(project, milestone),
      note,
      amountMinor: milestone.amountMinor,
      currency: project.currency,
      dueDate,
      replacesInvoiceId: input.replacesInvoiceId ?? null,
    });
    await audit("invoice", invoice._id, "created", { actor: "admin", to: "draft", detail: milestone.label });
    return invoice;
  } catch (err) {
    if (err?.code === 11000) {
      throw conflict("MILESTONE_INVOICED", "This milestone already has a live invoice. Void it first to issue a replacement.");
    }
    throw err;
  }
}

const DRAFT_FIELDS = ["dueDate", "note"];
const ISSUED_FIELDS = ["dueDate"];

export async function updateInvoice(id, patch) {
  const invoice = await getInvoice(id);
  const allowed = invoice.status === "draft" ? DRAFT_FIELDS : invoice.status === "unpaid" ? ISSUED_FIELDS : [];
  if (!allowed.length) throw conflict("INVOICE_LOCKED", `A ${invoice.status} invoice cannot be edited.`);
  const unknown = Object.keys(patch).filter((k) => !allowed.includes(k));
  if (unknown.length) {
    throw badRequest(
      invoice.status === "draft"
        ? `These fields cannot be changed: ${unknown.join(", ")}. The amount and description come from the project.`
        : `An issued invoice is fixed: only the due date can change. To correct anything else, void it and issue a replacement.`,
    );
  }
  const set = {};
  if ("dueDate" in patch) set.dueDate = dateString(patch.dueDate, "Due date");
  if ("note" in patch) set.note = text(patch.note, "Note", { max: 500, optional: true, multiline: true });
  const updated = await Invoice.findOneAndUpdate({ _id: invoice._id, status: invoice.status }, { $set: set }, { returnDocument: "after" });
  if (!updated) throw conflict("INVOICE_CHANGED", "The invoice changed while you were editing it. Reload and try again.");
  await audit("invoice", invoice._id, "updated", { actor: "admin", detail: Object.keys(set).join(", ") });
  return updated;
}

export async function deleteDraft(id) {
  const invoice = await getInvoice(id);
  if (invoice.status !== "draft") throw conflict("INVOICE_LOCKED", "Only a draft can be deleted. Issued invoices are voided instead.");
  const gone = await Invoice.findOneAndDelete({ _id: invoice._id, status: "draft" });
  if (!gone) throw conflict("INVOICE_CHANGED", "The invoice changed. Reload and try again.");
  await audit("invoice", invoice._id, "deleted", { actor: "admin", from: "draft", detail: invoice.milestoneLabel });
}

async function nextNumber(now = new Date()) {
  const year = now.getUTCFullYear();
  const counter = await Counter.findOneAndUpdate({ _id: `invoice-${year}` }, { $inc: { seq: 1 } }, { returnDocument: "after", upsert: true });
  return `${invoicePrefix()}-${year}-${String(counter.seq).padStart(4, "0")}`;
}

export async function issueInvoice(id) {
  const missing = missingBusinessDetails();
  if (missing.length) {
    throw new HttpError(409, "BUSINESS_DETAILS_MISSING", `Set ${missing.join(", ")} on the server before issuing invoices.`, { missing });
  }
  if (!invoiceLinkSecret()) {
    throw new HttpError(409, "LINK_SECRET_MISSING", "Set INVOICE_LINK_SECRET (32+ characters) on the server before issuing invoices.");
  }
  const invoice = await getInvoice(id);
  if (invoice.status !== "draft") throw conflict("INVOICE_LOCKED", `This invoice is already ${invoice.status}.`);
  if (invoice.dueDate < todayUtc()) throw badRequest("The due date is in the past. Pick a date from today on before issuing.");
  try {
    assertChargeable(invoice.amountMinor, invoice.currency);
  } catch (err) {
    if (err instanceof MoneyError) throw badRequest(err.message);
    throw err;
  }

  const number = await nextNumber();
  const issued = await Invoice.findOneAndUpdate(
    { _id: invoice._id, status: "draft" },
    { $set: { status: "unpaid", number, issuedAt: new Date(), business: businessProfile() } },
    { returnDocument: "after" },
  );
  if (!issued) throw conflict("INVOICE_CHANGED", "The invoice changed while issuing. Reload and try again.");
  await audit("invoice", invoice._id, "issued", { actor: "admin", from: "draft", to: "unpaid", detail: number });
  return issued;
}

export async function voidInvoice(id, reason) {
  const invoice = await getInvoice(id);
  const why = text(reason, "Reason", { min: 3, max: 300 });
  if (invoice.status === "paid") {
    throw conflict("INVOICE_PAID", "A paid invoice cannot be voided. Refund it in Stripe instead.");
  }
  if (invoice.status === "void") throw conflict("ALREADY_VOID", "This invoice is already void.");
  if (invoice.status === "draft") throw conflict("INVOICE_DRAFT", "A draft is deleted, not voided.");

  await closeOpenCheckouts(invoice._id);
  const voided = await Invoice.findOneAndUpdate(
    { _id: invoice._id, status: "unpaid" },
    { $set: { status: "void", voidedAt: new Date(), voidReason: why, active: false } },
    { returnDocument: "after" },
  );
  if (!voided) throw conflict("INVOICE_CHANGED", "The invoice changed while voiding, most likely because it was just paid. Reload.");
  await audit("invoice", invoice._id, "voided", { actor: "admin", from: "unpaid", to: "void", detail: why });
  return voided;
}

// Void-and-reissue: the controlled way to correct an issued invoice.
export async function reissueInvoice(id, { reason, dueDate, note }) {
  const old = await voidInvoice(id, reason);
  const replacement = await createDraft(old.projectId, {
    milestoneId: old.milestoneId,
    dueDate,
    note: note ?? old.note,
    replacesInvoiceId: old._id,
  });
  const voided = await Invoice.findOneAndUpdate(
    { _id: old._id },
    { $set: { replacedByInvoiceId: replacement._id } },
    { returnDocument: "after" },
  );
  await audit("invoice", old._id, "replaced", { actor: "admin", detail: `by draft ${replacement._id}` });
  return { voided, replacement };
}

export async function rotateLink(id) {
  const invoice = await getInvoice(id);
  if (invoice.status === "draft") throw conflict("INVOICE_DRAFT", "A draft has no client link yet. Issue it first.");
  const updated = await Invoice.findOneAndUpdate({ _id: invoice._id }, { $inc: { linkVersion: 1 }, $set: { linkEnabled: true } }, { returnDocument: "after" });
  await audit("invoice", invoice._id, "link_rotated", { actor: "admin", detail: "earlier links no longer work" });
  return updated;
}

export async function disableLink(id) {
  const invoice = await getInvoice(id);
  const updated = await Invoice.findOneAndUpdate({ _id: invoice._id }, { $set: { linkEnabled: false } }, { returnDocument: "after" });
  await audit("invoice", invoice._id, "link_disabled", { actor: "admin" });
  return updated;
}

// ---------------------------------------------------------------------------
// Views

const flagsOf = (invoice) => (invoice.flags ?? []).map((f) => ({ code: f.code, at: f.at, detail: f.detail }));

export function adminInvoiceView(invoice, extras = {}) {
  const status = effectiveStatus(invoice);
  let link = null;
  if (invoice.status !== "draft" && invoice.linkEnabled && invoiceLinkSecret()) link = invoiceLink(invoice);
  return {
    id: String(invoice._id),
    number: invoice.number ?? null,
    projectId: String(invoice.projectId),
    milestoneId: String(invoice.milestoneId),
    status,
    storedStatus: invoice.status,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    projectTitle: invoice.projectTitle,
    milestoneLabel: invoice.milestoneLabel,
    description: invoice.description,
    note: invoice.note,
    amountMinor: invoice.amountMinor,
    amountDisplay: formatMoney(invoice.amountMinor, invoice.currency),
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    issuedAt: invoice.issuedAt ?? null,
    paidAt: invoice.paidAt ?? null,
    voidedAt: invoice.voidedAt ?? null,
    voidReason: invoice.voidReason,
    replacesInvoiceId: invoice.replacesInvoiceId ? String(invoice.replacesInvoiceId) : null,
    replacedByInvoiceId: invoice.replacedByInvoiceId ? String(invoice.replacedByInvoiceId) : null,
    lastEmailedAt: invoice.lastEmailedAt ?? null,
    linkEnabled: invoice.linkEnabled,
    link,
    refundedMinor: invoice.refundedMinor,
    refundedDisplay: invoice.refundedMinor ? formatMoney(invoice.refundedMinor, invoice.currency) : null,
    disputeStatus: invoice.disputeStatus,
    flags: flagsOf(invoice),
    createdAt: invoice.createdAt,
    ...extras,
  };
}

export async function adminInvoiceDetail(invoice) {
  const [payments, trail, paymentTrail] = await Promise.all([
    Payment.find({ invoiceId: invoice._id }).sort({ createdAt: 1 }).lean(),
    history("invoice", invoice._id),
    (async () => {
      const ids = (await Payment.find({ invoiceId: invoice._id }, { _id: 1 }).lean()).map((p) => p._id);
      return ids.length ? AuditEntry.find({ entityType: "payment", entityId: { $in: ids } }).lean() : [];
    })(),
  ]);
  const events = [...trail, ...paymentTrail]
    .sort((a, b) => a.at - b.at)
    .map((e) => ({ at: e.at, scope: e.entityType, action: e.action, actor: e.actor, from: e.from, to: e.to, detail: e.detail }));
  return adminInvoiceView(invoice, {
    payments: payments.map((p) => ({
      id: String(p._id),
      status: p.status,
      amountDisplay: formatMoney(p.amountMinor, p.currency),
      sessionId: p.checkoutSessionId ?? null,
      paymentIntentId: p.paymentIntentId ?? null,
      livemode: p.livemode,
      failureCode: p.failureCode,
      createdAt: p.createdAt,
      paidAt: p.paidAt ?? null,
    })),
    history: events,
  });
}

// What a client sees. No internal ids, notes, flags, dispute state or the
// client's own email address.
export async function publicInvoiceView(invoice) {
  const status = effectiveStatus(invoice);
  const b = invoice.business ?? {};
  const payable = invoice.status === "unpaid";
  const confirming = payable ? await Payment.exists({ invoiceId: invoice._id, status: "processing" }) : null;
  return {
    number: invoice.number,
    status,
    business: { legalName: b.legalName, address: b.address, email: b.email, phone: b.phone || null, taxId: b.taxId || null, taxNote: b.taxNote || null },
    clientName: invoice.clientName,
    projectTitle: invoice.projectTitle,
    milestoneLabel: invoice.milestoneLabel,
    description: invoice.description,
    note: invoice.note || null,
    amountDisplay: formatMoney(invoice.amountMinor, invoice.currency),
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    issuedAt: invoice.issuedAt,
    paidAt: invoice.paidAt ?? null,
    voidedAt: invoice.voidedAt ?? null,
    refundedDisplay: invoice.refundedMinor ? formatMoney(invoice.refundedMinor, invoice.currency) : null,
    confirmingPayment: Boolean(confirming),
    canPay: payable && !confirming,
  };
}
