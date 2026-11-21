import mongoose, { Schema } from "mongoose";

// One checkout attempt for an invoice. The amount is copied from the invoice when
// the attempt is created and is compared with what the provider reports.
const PaymentSchema = new Schema(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    provider: { type: String, enum: ["stripe"], default: "stripe" },
    checkoutSessionId: { type: String, unique: true, sparse: true },
    paymentIntentId: { type: String, index: true, sparse: true },
    chargeId: { type: String, default: null },
    amountMinor: { type: Number, required: true },
    currency: { type: String, required: true, uppercase: true },
    livemode: { type: Boolean, default: false },
    // creating: row written, session not yet created. open: customer can still pay.
    // processing: provider has the order, money not yet confirmed (delayed methods).
    // paid: confirmed by a verified event. failed / expired / superseded: not paid.
    // rejected: the provider's figures did not match ours. refunded / partially_refunded.
    status: {
      type: String,
      enum: ["creating", "open", "processing", "paid", "failed", "expired", "superseded", "rejected", "refunded", "partially_refunded"],
      default: "creating",
      index: true,
    },
    failureCode: { type: String, default: null },
    expiresAt: Date,
    paidAt: Date,
    refundedMinor: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
