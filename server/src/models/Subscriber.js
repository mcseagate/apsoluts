import mongoose, { Schema } from "mongoose";

const SubscriberSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Set when the subscriber unsubscribes (or the owner removes them from mailings).
  // Empty means "receives campaign email". Signing up again clears it.
  unsubscribedAt: {
    type: Date,
    default: null,
  },
  // Set when the address owner clicks the confirmation link we email them. Nobody
  // receives campaign or outreach email without it (double opt-in), so a bot that
  // types someone else's address into the form cannot subscribe them.
  confirmedAt: {
    type: Date,
    default: null,
  },
  // When the last confirmation request went out: at most one a day per address.
  confirmationSentAt: {
    type: Date,
    default: null,
  },
  // Why the owner removed someone from mailings, if they did ("bot signup").
  suppressedReason: {
    type: String,
    default: "",
    maxlength: 80,
  },
});

export const Subscriber =
  mongoose.models.Subscriber ||
  mongoose.model("Subscriber", SubscriberSchema);
