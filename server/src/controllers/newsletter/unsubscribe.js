import { Subscriber } from "../../models/Subscriber.js";
import { connectDb } from "../../config/db.js";
import { verifyOptOutToken, verifyUnsubscribeToken } from "../../campaigns/unsubscribe.js";
import { optOutEmail } from "../../lib/subscribers.js";
import { clientIp, handle, HttpError, notFound } from "../../lib/http.js";
import { createLimiter } from "../../lib/rateLimit.js";

// Unsubscribing. Two callers use the same endpoint:
//   - the /unsubscribe page, after the person presses its button (token in the
//     X-Unsubscribe-Token header, so it stays out of request logs);
//   - a mail app's "Unsubscribe" button, which POSTs to the List-Unsubscribe
//     address (token in ?t=) with no further interaction.
// Two kinds of token work: one for a subscriber, and one for an address that is
// not on the list (a one-off message to someone who wrote to us), which puts the
// address on the do-not-email list. A wrong token answers the same 404 as an
// unknown one. Repeating it is harmless.

export const limiter = createLimiter({ windowMs: 10 * 60 * 1000, max: 60 });

export const unsubscribe = handle(async (c) => {
  c.header("Cache-Control", "no-store");
  if (!limiter.take(clientIp(c))) throw new HttpError(429, "RATE_LIMITED", "Too many requests. Please try again shortly.");
  const token = c.req.header("x-unsubscribe-token") || c.req.query("t");

  const address = verifyOptOutToken(token);
  if (address) {
    await optOutEmail(address, "unsubscribe");
    return c.json({ data: { unsubscribed: true } });
  }

  const id = verifyUnsubscribeToken(token);
  if (!id) throw notFound();
  await connectDb();
  const result = await Subscriber.updateOne({ _id: id, unsubscribedAt: null }, { $set: { unsubscribedAt: new Date() } });
  if (!result.matchedCount && !(await Subscriber.exists({ _id: id }))) throw notFound();
  return c.json({ data: { unsubscribed: true } });
});
