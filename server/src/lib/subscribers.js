import { connectDb } from "../config/db.js";
import { Subscriber } from "../models/Subscriber.js";

export async function addSubscriber(email) {
  await connectDb();

  const normalizedEmail = email.toLowerCase().trim();

  // Check if subscriber already exists
  const existing = await Subscriber.findOne({ email: normalizedEmail });
  if (existing) {
    // Signing up again is a fresh opt-in for someone who had unsubscribed.
    if (existing.unsubscribedAt) {
      await Subscriber.updateOne({ _id: existing._id }, { $set: { unsubscribedAt: null } });
      return { added: true, resubscribed: true };
    }
    return { added: false };
  }

  // Create new subscriber in MongoDB
  await Subscriber.create({ email: normalizedEmail });
  return { added: true };
}
