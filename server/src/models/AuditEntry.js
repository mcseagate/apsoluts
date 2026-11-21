import mongoose, { Schema } from "mongoose";

// Append-only history of status changes on quotes, projects, invoices and
// payments. Entries are written, never updated.
const AuditEntrySchema = new Schema(
  {
    entityType: { type: String, enum: ["quote", "project", "invoice", "payment"], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, required: true, maxlength: 60 },
    actor: { type: String, required: true, maxlength: 40 }, // admin | client | stripe | system
    from: { type: String, default: null },
    to: { type: String, default: null },
    detail: { type: String, maxlength: 400, default: "" },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false },
);
AuditEntrySchema.index({ entityType: 1, entityId: 1, at: 1 });

export const AuditEntry = mongoose.models.AuditEntry || mongoose.model("AuditEntry", AuditEntrySchema);
