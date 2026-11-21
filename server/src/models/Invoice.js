import mongoose, { Schema } from "mongoose";

const BusinessSnapshotSchema = new Schema(
  {
    legalName: String,
    address: String,
    email: String,
    phone: String,
    taxId: String,
    taxNote: String,
  },
  { _id: false },
);

const FlagSchema = new Schema(
  {
    code: {
      type: String,
      enum: ["duplicate_payment", "paid_after_void", "payment_mismatch", "refunded", "disputed"],
      required: true,
    },
    at: { type: Date, default: Date.now },
    detail: { type: String, maxlength: 300, default: "" },
  },
  { _id: false },
);

// An invoice for one payment milestone of a project.
//
// Once issued, amountMinor, currency, description and the business snapshot
// never change (see services/invoices.js). A correction is a new invoice: the
// old one is voided and its replacement points back at it.
//
// "overdue" is not stored. An unpaid invoice whose due date has passed is
// reported as overdue, so no scheduled job has to flip it.
const InvoiceSchema = new Schema(
  {
    // Assigned when the invoice is issued, so drafts leave no gaps in the sequence.
    number: { type: String, unique: true, sparse: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    milestoneId: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ["draft", "unpaid", "paid", "void"], default: "draft", index: true },
    // True while this invoice is the live claim on its milestone: a draft, an
    // unpaid invoice, or a paid one that has not been refunded in full. The
    // partial unique index below lets only one such invoice exist per milestone,
    // even when two requests race.
    active: { type: Boolean, default: true },

    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true, lowercase: true },
    projectTitle: { type: String, required: true },
    milestoneLabel: { type: String, required: true },
    description: { type: String, required: true },
    note: { type: String, trim: true, maxlength: 500, default: "" },

    amountMinor: { type: Number, required: true, validate: { validator: Number.isSafeInteger, message: "amountMinor must be an integer" } },
    currency: { type: String, required: true, uppercase: true, maxlength: 3 },
    // Calendar date, YYYY-MM-DD, compared against today's UTC date.
    dueDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },

    business: { type: BusinessSnapshotSchema, default: null },
    issuedAt: Date,
    paidAt: Date,
    voidedAt: Date,
    voidReason: { type: String, maxlength: 300, default: "" },
    replacesInvoiceId: { type: Schema.Types.ObjectId, default: null },
    replacedByInvoiceId: { type: Schema.Types.ObjectId, default: null },
    lastEmailedAt: Date,

    // The client link is HMAC(INVOICE_LINK_SECRET, id + linkVersion). Rotating
    // bumps linkVersion, which kills every earlier link; disabling kills them all.
    linkVersion: { type: Number, default: 1 },
    linkEnabled: { type: Boolean, default: true },

    // Provider references, filled in by verified webhook events.
    paidPaymentId: { type: Schema.Types.ObjectId, default: null },
    paymentIntentId: { type: String, default: null },
    refundedMinor: { type: Number, default: 0 },
    disputeStatus: { type: String, default: null },
    flags: { type: [FlagSchema], default: [] },
  },
  { timestamps: true },
);
InvoiceSchema.index({ createdAt: -1 });
InvoiceSchema.index({ status: 1, dueDate: 1 });
InvoiceSchema.index({ milestoneId: 1 }, { unique: true, partialFilterExpression: { active: true } });

export const Invoice = mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
