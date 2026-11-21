import mongoose, { Schema } from "mongoose";

// A visitor's request for a custom project quote, from the public form.
const QuoteRequestSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    requirements: { type: String, required: true, trim: true, maxlength: 5000 },
    // Free text the visitor typed ("$5k to $10k"); never used in arithmetic.
    budget: { type: String, trim: true, maxlength: 100, default: "" },
    // Hash of email + requirements, to drop a double submission.
    fingerprint: { type: String, index: true },
    status: { type: String, enum: ["new", "reviewing", "converted", "declined"], default: "new", index: true },
    adminNote: { type: String, trim: true, maxlength: 2000, default: "" },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
  },
  { timestamps: true },
);
QuoteRequestSchema.index({ createdAt: -1 });

export const QuoteRequest = mongoose.models.QuoteRequest || mongoose.model("QuoteRequest", QuoteRequestSchema);
