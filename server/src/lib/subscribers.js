import { connectDb } from "../config/db.js";
import { OptOut } from "../models/OptOut.js";
import { Subscriber } from "../models/Subscriber.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Records a signup request. Nobody is mailed anything except the confirmation
// link until the owner of the address clicks it (double opt-in), so typing
// someone else's address into the form cannot subscribe them.
//
// Returns { subscriber, sendConfirmation }. sendConfirmation is false when the
// address is already an active subscriber, or when a confirmation went out in the
// last 24 hours (so the form cannot be used to flood one inbox).
export async function requestSubscription(email, now = new Date()) {
  await connectDb();
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await Subscriber.findOne({ email: normalizedEmail });
  if (existing && existing.confirmedAt && !existing.unsubscribedAt) {
    return { subscriber: existing, sendConfirmation: false };
  }
  if (existing) {
    const recent = existing.confirmationSentAt && now - existing.confirmationSentAt < DAY_MS;
    if (recent) return { subscriber: existing, sendConfirmation: false };
    existing.confirmationSentAt = now;
    await existing.save();
    return { subscriber: existing, sendConfirmation: true };
  }
  try {
    const subscriber = await Subscriber.create({ email: normalizedEmail, confirmationSentAt: now });
    return { subscriber, sendConfirmation: true };
  } catch (err) {
    if (err?.code === 11000) return { subscriber: await Subscriber.findOne({ email: normalizedEmail }), sendConfirmation: false };
    throw err;
  }
}

// Marks the address as confirmed and subscribed. Returns { subscriber, changed }:
// changed is false when nothing needed doing (the link was already used).
export async function confirmSubscription(id, now = new Date()) {
  await connectDb();
  const subscriber = await Subscriber.findById(id);
  if (!subscriber) return null;
  const changed = !subscriber.confirmedAt || Boolean(subscriber.unsubscribedAt);
  if (changed) {
    subscriber.confirmedAt = subscriber.confirmedAt ?? now;
    subscriber.unsubscribedAt = null;
    subscriber.suppressedReason = "";
    await subscriber.save();
    // Choosing to subscribe again overrides an earlier opt-out of this address.
    await OptOut.deleteOne({ email: subscriber.email });
  }
  return { subscriber, changed };
}

// Records that an address must not be emailed. Works for subscribers and for
// people who only ever wrote to us.
export async function optOutEmail(email, source = "unsubscribe") {
  await connectDb();
  const normalized = email.toLowerCase().trim();
  await OptOut.updateOne({ email: normalized }, { $setOnInsert: { email: normalized, source, at: new Date() } }, { upsert: true });
  await Subscriber.updateOne({ email: normalized, unsubscribedAt: null }, { $set: { unsubscribedAt: new Date() } });
}

// Who may be sent marketing email: confirmed, not unsubscribed, not on the
// do-not-email list. Every send path goes through this.
export async function deliverableSubscribers(projection = { email: 1 }) {
  await connectDb();
  const [subscribers, optOuts] = await Promise.all([
    Subscriber.find({ unsubscribedAt: null, confirmedAt: { $ne: null } }, projection).lean(),
    OptOut.find({}, { email: 1 }).lean(),
  ]);
  const blocked = new Set(optOuts.map((o) => o.email));
  return subscribers.filter((s) => !blocked.has(s.email));
}

export async function isOptedOut(email) {
  await connectDb();
  return Boolean(await OptOut.exists({ email: email.toLowerCase().trim() }));
}
