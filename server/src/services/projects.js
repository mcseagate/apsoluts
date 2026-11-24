import { createHash } from "node:crypto";
import { Project } from "../models/Project.js";
import { QuoteRequest } from "../models/QuoteRequest.js";
import { Invoice } from "../models/Invoice.js";
import { billingCurrency } from "../lib/billingConfig.js";
import { assertChargeable, formatMoney, MoneyError, parseMoney, sumMinor } from "../lib/money.js";
import { badRequest, conflict, notFound } from "../lib/http.js";
import { audit } from "../lib/audit.js";
import { dateString, email, intInRange, oneOf, text } from "../lib/validate.js";

// Projects: the agreed scope, price and payment milestones behind invoices.

const KINDS = ["deposit", "milestone", "final"];
const METHODS = ["email", "signed_document", "verbal", "other"];
const EDITABLE = ["clientName", "clientEmail", "title", "scope", "deliverables", "price", "timeline", "milestones"];

// Amounts arrive as strings ("1500.00"). A JSON number would already have been
// through floating point, so it is refused outright.
function moneyField(value, field, currency) {
  if (typeof value !== "string") throw badRequest(`${field} must be a string such as "1500.00".`);
  try {
    return parseMoney(value, currency);
  } catch (err) {
    if (err instanceof MoneyError) throw badRequest(`${field}: ${err.message}`);
    throw err;
  }
}

function cleanMilestones(list, currency) {
  if (!Array.isArray(list) || list.length > 20) throw badRequest("milestones must be a list of at most 20.");
  return list.map((m, i) => {
    if (!m || typeof m !== "object") throw badRequest(`Milestone ${i + 1} is not valid.`);
    return {
      label: text(m.label, `Milestone ${i + 1} label`, { max: 120 }),
      kind: oneOf(m.kind ?? "milestone", KINDS, `Milestone ${i + 1} kind`),
      amountMinor: moneyField(m.amount, `Milestone ${i + 1} amount`, currency),
      dueInDays: intInRange(m.dueInDays ?? 14, `Milestone ${i + 1} dueInDays`, 0, 365),
    };
  });
}

// What the client agrees to. The hash is stored with the acceptance, so it is
// provable later which terms were accepted.
export function termsHash(p) {
  const canonical = JSON.stringify({
    title: p.title,
    scope: p.scope,
    deliverables: p.deliverables,
    priceMinor: p.priceMinor,
    currency: p.currency,
    timeline: p.timeline,
    milestones: p.milestones.map((m) => ({ label: m.label, kind: m.kind, amountMinor: m.amountMinor, dueInDays: m.dueInDays })),
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export async function getProject(id) {
  const project = await Project.findById(id);
  if (!project) throw notFound("Project not found.");
  return project;
}

export async function createProjectFromQuote(quoteId, input = {}) {
  const currency = billingCurrency();
  // Claim the request first, so two clicks cannot create two projects.
  const quote = await QuoteRequest.findOneAndUpdate(
    { _id: quoteId, status: { $in: ["new", "reviewing"] }, projectId: null },
    { $set: { status: "converted" } },
    { returnDocument: "after" },
  );
  if (!quote) {
    const exists = await QuoteRequest.exists({ _id: quoteId });
    if (!exists) throw notFound("Quote request not found.");
    throw conflict("ALREADY_HANDLED", "This request was already converted or declined.");
  }
  try {
    const project = await Project.create({
      quoteRequestId: quote._id,
      clientName: quote.name,
      clientEmail: quote.email,
      title: input.title ? text(input.title, "Title", { max: 120 }) : `Project for ${quote.name}`.slice(0, 120),
      scope: quote.requirements,
      currency,
      offer: quote.offer ?? null,
    });
    await QuoteRequest.updateOne({ _id: quote._id }, { $set: { projectId: project._id } });
    await audit("quote", quote._id, "converted", { actor: "admin", from: "new", to: "converted", detail: `project ${project._id}` });
    await audit("project", project._id, "created", { actor: "admin", to: "draft", detail: `from quote ${quote._id}` });
    return project;
  } catch (err) {
    // Hand the request back if the project could not be created.
    await QuoteRequest.updateOne({ _id: quote._id, projectId: null }, { $set: { status: "reviewing" } });
    throw err;
  }
}

export async function updateProject(id, patch) {
  const unknown = Object.keys(patch).filter((k) => !EDITABLE.includes(k));
  if (unknown.length) throw badRequest(`These fields cannot be changed here: ${unknown.join(", ")}.`);

  const project = await getProject(id);
  if (project.acceptance) {
    throw conflict("PROJECT_LOCKED", "The client has accepted this scope, so it can no longer be edited. Withdraw the acceptance first if it must change.");
  }
  if (project.status !== "draft") throw conflict("PROJECT_LOCKED", "Only a draft project can be edited.");

  const set = {};
  if ("clientName" in patch) set.clientName = text(patch.clientName, "Client name", { max: 100 });
  if ("clientEmail" in patch) set.clientEmail = email(patch.clientEmail, "Client email");
  if ("title" in patch) set.title = text(patch.title, "Title", { max: 120 });
  if ("scope" in patch) set.scope = text(patch.scope, "Scope", { max: 10000, optional: true, multiline: true });
  if ("timeline" in patch) set.timeline = text(patch.timeline, "Timeline", { max: 500, optional: true });
  if ("deliverables" in patch) {
    if (!Array.isArray(patch.deliverables) || patch.deliverables.length > 50) throw badRequest("deliverables must be a list of at most 50.");
    set.deliverables = patch.deliverables.map((d, i) => text(d, `Deliverable ${i + 1}`, { max: 300 }));
  }
  if ("price" in patch) set.priceMinor = moneyField(patch.price, "Price", project.currency);
  if ("milestones" in patch) set.milestones = cleanMilestones(patch.milestones, project.currency);

  project.set(set);
  await project.save();
  await audit("project", project._id, "updated", { actor: "admin", detail: Object.keys(set).join(", ") });
  return project;
}

// Checks the terms are complete and add up. Used before accepting and before
// issuing anything.
export function assertTermsReady(project) {
  if (!project.milestones.length) throw badRequest("Add at least one payment milestone.");
  try {
    assertChargeable(project.priceMinor, project.currency);
    project.milestones.forEach((m) => assertChargeable(m.amountMinor, project.currency));
    const total = sumMinor(project.milestones.map((m) => m.amountMinor));
    if (total !== project.priceMinor) {
      throw badRequest(
        `Milestones add up to ${formatMoney(total, project.currency)} but the price is ${formatMoney(project.priceMinor, project.currency)}.`,
      );
    }
  } catch (err) {
    if (err instanceof MoneyError) throw badRequest(err.message);
    throw err;
  }
  if (!project.scope) throw badRequest("Write the scope before recording acceptance.");
}

export async function recordAcceptance(id, input) {
  const project = await getProject(id);
  if (project.acceptance) throw conflict("ALREADY_ACCEPTED", "Acceptance is already recorded for this project.");
  if (project.status !== "draft") throw conflict("PROJECT_LOCKED", "This project is closed.");
  assertTermsReady(project);

  const acceptedAt = input.acceptedAt ? new Date(`${dateString(input.acceptedAt, "Accepted date")}T00:00:00Z`) : new Date();
  if (acceptedAt.getTime() > Date.now() + 86_400_000) throw badRequest("The acceptance date cannot be in the future.");

  const acceptance = {
    acceptedAt,
    acceptedBy: text(input.acceptedBy, "Accepted by", { max: 100 }),
    method: oneOf(input.method, METHODS, "Method"),
    reference: text(input.reference, "Reference", { max: 300, optional: true }),
    termsHash: termsHash(project),
  };
  const updated = await Project.findOneAndUpdate(
    { _id: project._id, acceptance: null, status: "draft" },
    { $set: { acceptance, status: "active" } },
    { returnDocument: "after" },
  );
  if (!updated) throw conflict("ALREADY_ACCEPTED", "Acceptance is already recorded for this project.");
  await audit("project", project._id, "accepted", { actor: "admin", from: "draft", to: "active", detail: `${acceptance.method} by ${acceptance.acceptedBy}` });
  return updated;
}

export async function withdrawAcceptance(id) {
  const project = await getProject(id);
  if (!project.acceptance) throw conflict("NOT_ACCEPTED", "No acceptance is recorded.");
  const live = await Invoice.exists({ projectId: project._id, status: { $ne: "void" } });
  if (live) throw conflict("HAS_INVOICES", "Invoices exist for this project. Void them (or delete the drafts) before withdrawing acceptance.");
  const updated = await Project.findOneAndUpdate({ _id: project._id }, { $set: { acceptance: null, status: "draft" } }, { returnDocument: "after" });
  await audit("project", project._id, "acceptance_withdrawn", { actor: "admin", from: "active", to: "draft" });
  return updated;
}

export async function closeProject(id, status) {
  oneOf(status, ["completed", "cancelled"], "status");
  const project = await getProject(id);
  if (project.status !== "active") throw conflict("INVALID_STATE", "Only an accepted, open project can be closed.");
  const open = await Invoice.exists({ projectId: project._id, status: { $in: ["draft", "unpaid"] } });
  if (open) throw conflict("HAS_OPEN_INVOICES", "Void or settle this project's open invoices first.");
  const updated = await Project.findOneAndUpdate({ _id: project._id, status: "active" }, { $set: { status } }, { returnDocument: "after" });
  await audit("project", project._id, status, { actor: "admin", from: "active", to: status });
  return updated;
}
