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
});

export const Subscriber =
  mongoose.models.Subscriber ||
  mongoose.model("Subscriber", SubscriberSchema);
