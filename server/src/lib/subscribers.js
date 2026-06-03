import { connectDb } from "../config/db.js";
import { Subscriber } from "../models/Subscriber.js";

export async function addSubscriber(email) {
  await connectDb();

  const normalizedEmail = email.toLowerCase().trim();

  // Check if subscriber already exists
  const existing = await Subscriber.findOne({ email: normalizedEmail });
  if (existing) {
    return { added: false };
  }

  // Create new subscriber in MongoDB
  await Subscriber.create({ email: normalizedEmail });
  return { added: true };
}
