import mongoose, { Schema } from "mongoose";

// Every provider event we receive, kept once. The unique eventId is what makes
// a redelivered or duplicated event harmless. The raw payload is not stored: it
// holds customer details we do not need.
const PaymentEventSchema = new Schema(
  {
    provider: { type: String, default: "stripe" },
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    livemode: { type: Boolean, default: false },
    invoiceId: { type: Schema.Types.ObjectId, default: null, index: true },
    outcome: { type: String, enum: ["applied", "ignored", "rejected", "duplicate"], default: null },
    reason: { type: String, maxlength: 200, default: "" },
    receivedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
  },
  { timestamps: false },
);

export const PaymentEvent = mongoose.models.PaymentEvent || mongoose.model("PaymentEvent", PaymentEventSchema);
