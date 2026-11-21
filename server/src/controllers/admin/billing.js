import { QuoteRequest } from "../../models/QuoteRequest.js";
import { Project } from "../../models/Project.js";
import { Invoice } from "../../models/Invoice.js";
import { connectDb } from "../../config/db.js";
import { billingStatus } from "../../lib/billingConfig.js";
import { formatMoney, minorToDecimalString } from "../../lib/money.js";
import { badRequest, conflict, handle, HttpError, notFound, readJson } from "../../lib/http.js";
import { audit, history } from "../../lib/audit.js";
import { objectId, oneOf, text, todayUtc } from "../../lib/validate.js";
import { sendInvoiceToClient } from "../../lib/notify.js";
import {
  closeProject,
  createProjectFromQuote,
  getProject,
  recordAcceptance,
  updateProject,
  withdrawAcceptance,
} from "../../services/projects.js";
import {
  adminInvoiceDetail,
  adminInvoiceView,
  createDraft,
  deleteDraft,
  disableLink,
  getInvoice,
  issueInvoice,
  reissueInvoice,
  rotateLink,
  updateInvoice,
  voidInvoice,
} from "../../services/invoices.js";

// Administrator endpoints for quotes, projects and invoices. requireAdmin runs
// before every one of them (see routes/admin.js).

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function paging(c) {
  const page = Math.max(1, Number(c.req.query("page") || 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") || 20) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

const ok = (c, data, status = 200) => c.json({ data }, status);

// Views ---------------------------------------------------------------

const quoteView = (q) => ({
  id: String(q._id),
  name: q.name,
  email: q.email,
  requirements: q.requirements,
  budget: q.budget,
  status: q.status,
  adminNote: q.adminNote,
  projectId: q.projectId ? String(q.projectId) : null,
  createdAt: q.createdAt,
});

function projectView(p, invoices = []) {
  const byMilestone = new Map();
  for (const inv of invoices) {
    // The live invoice (or the newest) is the one to show beside the milestone.
    const key = String(inv.milestoneId);
    const prior = byMilestone.get(key);
    if (!prior || inv.active || prior.status === "void") byMilestone.set(key, inv);
  }
  return {
    id: String(p._id),
    quoteRequestId: p.quoteRequestId ? String(p.quoteRequestId) : null,
    clientName: p.clientName,
    clientEmail: p.clientEmail,
    title: p.title,
    scope: p.scope,
    deliverables: p.deliverables,
    price: minorToDecimalString(p.priceMinor, p.currency),
    priceMinor: p.priceMinor,
    priceDisplay: formatMoney(p.priceMinor, p.currency),
    currency: p.currency,
    timeline: p.timeline,
    status: p.status,
    acceptance: p.acceptance
      ? {
          acceptedAt: p.acceptance.acceptedAt,
          acceptedBy: p.acceptance.acceptedBy,
          method: p.acceptance.method,
          reference: p.acceptance.reference,
          termsHash: p.acceptance.termsHash,
        }
      : null,
    milestones: p.milestones.map((m) => {
      const inv = byMilestone.get(String(m._id));
      return {
        id: String(m._id),
        label: m.label,
        kind: m.kind,
        amount: minorToDecimalString(m.amountMinor, p.currency),
        amountMinor: m.amountMinor,
        amountDisplay: formatMoney(m.amountMinor, p.currency),
        dueInDays: m.dueInDays,
        invoice: inv ? { id: String(inv._id), number: inv.number ?? null, status: inv.status } : null,
      };
    }),
    createdAt: p.createdAt,
  };
}

// Status ---------------------------------------------------------------

export const getBillingStatus = handle(async (c) => ok(c, billingStatus()));

// Quotes ---------------------------------------------------------------

export const listQuotes = handle(async (c) => {
  await connectDb();
  const { page, limit, skip } = paging(c);
  const query = {};
  const status = c.req.query("status");
  if (status) query.status = oneOf(status, ["new", "reviewing", "converted", "declined"], "status");
  const search = (c.req.query("q") || "").trim().slice(0, 100);
  if (search) {
    const re = { $regex: escapeRegExp(search), $options: "i" };
    query.$or = [{ name: re }, { email: re }];
  }
  const [total, rows] = await Promise.all([
    QuoteRequest.countDocuments(query),
    QuoteRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);
  return ok(c, { quotes: rows.map(quoteView), total, page, limit, totalPages: Math.ceil(total / limit) });
});

export const getQuote = handle(async (c) => {
  await connectDb();
  const id = objectId(c.req.param("id"));
  const quote = await QuoteRequest.findById(id).lean();
  if (!quote) throw notFound("Quote request not found.");
  return ok(c, { ...quoteView(quote), history: await history("quote", id) });
});

export const updateQuote = handle(async (c) => {
  await connectDb();
  const id = objectId(c.req.param("id"));
  const body = await readJson(c);
  const unknown = Object.keys(body).filter((k) => !["status", "adminNote"].includes(k));
  if (unknown.length) throw badRequest(`These fields cannot be changed: ${unknown.join(", ")}.`);
  const quote = await QuoteRequest.findById(id);
  if (!quote) throw notFound("Quote request not found.");
  if (quote.status === "converted") throw conflict("ALREADY_HANDLED", "This request has been converted to a project.");
  const set = {};
  if ("status" in body) set.status = oneOf(body.status, ["new", "reviewing", "declined"], "status");
  if ("adminNote" in body) set.adminNote = text(body.adminNote, "Note", { max: 2000, optional: true, multiline: true });
  const updated = await QuoteRequest.findOneAndUpdate({ _id: id, status: { $ne: "converted" } }, { $set: set }, { returnDocument: "after" });
  if (!updated) throw conflict("ALREADY_HANDLED", "This request has been converted to a project.");
  if (set.status && set.status !== quote.status) {
    await audit("quote", id, "status", { actor: "admin", from: quote.status, to: set.status });
  }
  return ok(c, quoteView(updated));
});

export const convertQuote = handle(async (c) => {
  await connectDb();
  const id = objectId(c.req.param("id"));
  const body = await readJson(c);
  const project = await createProjectFromQuote(id, body);
  return ok(c, projectView(project), 201);
});

// Projects -------------------------------------------------------------

export const listProjects = handle(async (c) => {
  await connectDb();
  const { page, limit, skip } = paging(c);
  const query = {};
  const status = c.req.query("status");
  if (status) query.status = oneOf(status, ["draft", "active", "completed", "cancelled"], "status");
  const [total, rows] = await Promise.all([
    Project.countDocuments(query),
    Project.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);
  return ok(c, { projects: rows.map((p) => projectView(p)), total, page, limit, totalPages: Math.ceil(total / limit) });
});

export const getProjectDetail = handle(async (c) => {
  await connectDb();
  const project = await getProject(objectId(c.req.param("id")));
  const invoices = await Invoice.find({ projectId: project._id }).sort({ createdAt: 1 });
  return ok(c, {
    ...projectView(project, invoices),
    invoices: invoices.map((i) => adminInvoiceView(i)),
    history: await history("project", project._id),
  });
});

export const patchProject = handle(async (c) => {
  await connectDb();
  const project = await updateProject(objectId(c.req.param("id")), await readJson(c));
  return ok(c, projectView(project));
});

export const acceptProject = handle(async (c) => {
  await connectDb();
  const project = await recordAcceptance(objectId(c.req.param("id")), await readJson(c));
  return ok(c, projectView(project));
});

export const unacceptProject = handle(async (c) => {
  await connectDb();
  const project = await withdrawAcceptance(objectId(c.req.param("id")));
  return ok(c, projectView(project));
});

export const closeProjectRoute = handle(async (c) => {
  await connectDb();
  const body = await readJson(c);
  const project = await closeProject(objectId(c.req.param("id")), body.status);
  return ok(c, projectView(project));
});

// Invoices -------------------------------------------------------------

export const listInvoices = handle(async (c) => {
  await connectDb();
  const { page, limit, skip } = paging(c);
  const query = {};
  const status = c.req.query("status");
  const today = todayUtc();
  if (status === "overdue") Object.assign(query, { status: "unpaid", dueDate: { $lt: today } });
  else if (status === "unpaid") Object.assign(query, { status: "unpaid", dueDate: { $gte: today } });
  else if (status) query.status = oneOf(status, ["draft", "paid", "void"], "status");
  const search = (c.req.query("q") || "").trim().slice(0, 100);
  if (search) {
    const re = { $regex: escapeRegExp(search), $options: "i" };
    query.$or = [{ number: re }, { clientName: re }, { projectTitle: re }];
  }
  const projectId = c.req.query("projectId");
  if (projectId) query.projectId = objectId(projectId, "projectId");
  const [total, rows] = await Promise.all([
    Invoice.countDocuments(query),
    Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);
  return ok(c, { invoices: rows.map((i) => adminInvoiceView(i)), total, page, limit, totalPages: Math.ceil(total / limit) });
});

export const getInvoiceDetail = handle(async (c) => {
  await connectDb();
  const invoice = await getInvoice(objectId(c.req.param("id")));
  return ok(c, await adminInvoiceDetail(invoice));
});

export const createInvoiceDraft = handle(async (c) => {
  await connectDb();
  const projectId = objectId(c.req.param("id"));
  const body = await readJson(c);
  const unknown = Object.keys(body).filter((k) => !["milestoneId", "dueDate", "note"].includes(k));
  if (unknown.length) throw badRequest(`These fields cannot be set: ${unknown.join(", ")}. The amount comes from the milestone.`);
  const milestoneId = objectId(body.milestoneId, "milestoneId");
  const invoice = await createDraft(projectId, { ...body, milestoneId });
  return ok(c, adminInvoiceView(invoice), 201);
});

export const patchInvoice = handle(async (c) => {
  await connectDb();
  const invoice = await updateInvoice(objectId(c.req.param("id")), await readJson(c));
  return ok(c, adminInvoiceView(invoice));
});

export const removeInvoiceDraft = handle(async (c) => {
  await connectDb();
  await deleteDraft(objectId(c.req.param("id")));
  return ok(c, { deleted: true });
});

export const issue = handle(async (c) => {
  await connectDb();
  const invoice = await issueInvoice(objectId(c.req.param("id")));
  return ok(c, adminInvoiceView(invoice));
});

export const voidRoute = handle(async (c) => {
  await connectDb();
  const body = await readJson(c);
  const invoice = await voidInvoice(objectId(c.req.param("id")), body.reason);
  return ok(c, adminInvoiceView(invoice));
});

export const reissue = handle(async (c) => {
  await connectDb();
  const body = await readJson(c);
  const unknown = Object.keys(body).filter((k) => !["reason", "dueDate", "note"].includes(k));
  if (unknown.length) throw badRequest(`These fields cannot be set: ${unknown.join(", ")}.`);
  const { voided, replacement } = await reissueInvoice(objectId(c.req.param("id")), body);
  return ok(c, { voided: adminInvoiceView(voided), replacement: adminInvoiceView(replacement) }, 201);
});

export const rotateLinkRoute = handle(async (c) => {
  await connectDb();
  return ok(c, adminInvoiceView(await rotateLink(objectId(c.req.param("id")))));
});

export const disableLinkRoute = handle(async (c) => {
  await connectDb();
  return ok(c, adminInvoiceView(await disableLink(objectId(c.req.param("id")))));
});

export const sendInvoice = handle(async (c) => {
  await connectDb();
  const invoice = await getInvoice(objectId(c.req.param("id")));
  if (invoice.status !== "unpaid") throw conflict("INVOICE_NOT_PAYABLE", `A ${invoice.status} invoice is not emailed to the client.`);
  if (!invoice.linkEnabled) throw conflict("LINK_DISABLED", "The client link is disabled. Create a new link first.");
  let result;
  try {
    result = await sendInvoiceToClient(invoice);
  } catch (err) {
    console.error("[Billing] Invoice email failed:", err.message);
    throw new HttpError(502, "EMAIL_ERROR", "The email service refused the message. Try again, or copy the link and send it yourself.");
  }
  if (!result.sent) throw new HttpError(503, "MAIL_NOT_CONFIGURED", "Email is not configured on the server. Copy the link and send it yourself.");
  const updated = await Invoice.findOneAndUpdate({ _id: invoice._id }, { $set: { lastEmailedAt: new Date() } }, { returnDocument: "after" });
  await audit("invoice", invoice._id, "emailed", { actor: "admin", detail: "link sent to the client's address on file" });
  return ok(c, adminInvoiceView(updated));
});
