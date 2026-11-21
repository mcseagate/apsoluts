import { AuditEntry } from "../models/AuditEntry.js";

// Appends one history entry. Detail text must never carry card data, tokens or
// keys; callers pass short identifiers and reasons only.
export async function audit(entityType, entityId, action, { actor = "system", from = null, to = null, detail = "" } = {}) {
  await AuditEntry.create({ entityType, entityId, action, actor, from, to, detail: String(detail).slice(0, 400) });
}

export const history = (entityType, entityId) =>
  AuditEntry.find({ entityType, entityId }).sort({ at: 1 }).lean();
