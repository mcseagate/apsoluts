import { handle, HttpError, notFound, clientIp, readJson } from "../../lib/http.js";
import { createLimiter } from "../../lib/rateLimit.js";
import { verifyConfirmToken } from "../../campaigns/unsubscribe.js";
import { confirmSubscription } from "../../lib/subscribers.js";
import { sendNewsletterConfirmation, sendNewsletterAdminNotification } from "../../lib/email.js";

// Confirming a signup. The /confirm page posts here after the person presses its
// button (a button, not an automatic request, because mail security scanners open
// every link in a message and must not be able to confirm on someone's behalf).
// The token is in a header so it stays out of request logs. Repeating it is
// harmless: the welcome email and the owner's alert go out only the first time.

export const limiter = createLimiter({ windowMs: 10 * 60 * 1000, max: 60 });

export const confirm = handle(async (c) => {
  c.header("Cache-Control", "no-store");
  if (!limiter.take(clientIp(c))) throw new HttpError(429, "RATE_LIMITED", "Too many requests. Please try again shortly.");
  await readJson(c, 1024).catch(() => ({}));
  const id = verifyConfirmToken(c.req.header("x-confirm-token"));
  if (!id) throw notFound();
  const result = await confirmSubscription(id);
  if (!result) throw notFound();
  if (result.changed) {
    const { email } = result.subscriber;
    sendNewsletterConfirmation(email).catch((err) => console.error("[Newsletter] Welcome email failed:", err?.message ?? err));
    sendNewsletterAdminNotification(email).catch((err) => console.error("[Newsletter] Admin alert failed:", err?.message ?? err));
  }
  return c.json({ data: { confirmed: true } });
});
