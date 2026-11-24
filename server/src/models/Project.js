import mongoose, { Schema } from "mongoose";

const MilestoneSchema = new Schema({
  label: { type: String, required: true, trim: true, maxlength: 120 },
  kind: { type: String, enum: ["deposit", "milestone", "final"], default: "milestone" },
  // Integer minor units (cents for USD). Never a float.
  amountMinor: { type: Number, required: true, validate: { validator: Number.isSafeInteger, message: "amountMinor must be an integer" } },
  // Days after the invoice is issued that it falls due.
  dueInDays: { type: Number, default: 14, min: 0, max: 365, validate: Number.isInteger },
});

const AcceptanceSchema = new Schema(
  {
    acceptedAt: { type: Date, required: true },
    acceptedBy: { type: String, required: true, trim: true, maxlength: 100 },
    method: { type: String, enum: ["email", "signed_document", "verbal", "other"], required: true },
    reference: { type: String, trim: true, maxlength: 300, default: "" },
    // Hash of the terms as they stood when the client accepted them.
    termsHash: { type: String, required: true },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// An agreed piece of work, created by an administrator from a quote request.
const ProjectSchema = new Schema(
  {
    quoteRequestId: { type: Schema.Types.ObjectId, ref: "QuoteRequest", default: null, index: true },
    clientName: { type: String, required: true, trim: true, maxlength: 100 },
    clientEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    scope: { type: String, trim: true, maxlength: 10000, default: "" },
    deliverables: { type: [{ type: String, trim: true, maxlength: 300 }], default: [] },
    priceMinor: { type: Number, default: 0, validate: { validator: Number.isSafeInteger, message: "priceMinor must be an integer" } },
    currency: { type: String, required: true, uppercase: true, maxlength: 3 },
    timeline: { type: String, trim: true, maxlength: 500, default: "" },
    milestones: { type: [MilestoneSchema], default: [] },
    // draft: still being written; active: scope accepted; completed/cancelled: closed.
    status: { type: String, enum: ["draft", "active", "completed", "cancelled"], default: "draft", index: true },
    acceptance: { type: AcceptanceSchema, default: null },
    // The holiday offer carried over from the quote request: a note for whoever
    // sets the price. It does not change any amount by itself.
    offer: {
      type: new Schema({ code: String, holiday: String, percent: Number, validThrough: String }, { _id: false }),
      default: null,
    },
  },
  { timestamps: true },
);
ProjectSchema.index({ createdAt: -1 });

export const Project = mongoose.models.Project || mongoose.model("Project", ProjectSchema);
