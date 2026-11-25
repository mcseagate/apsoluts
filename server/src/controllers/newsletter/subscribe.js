import { clientIp, handle, HttpError, readJson } from "../../lib/http.js";
import { createLimiter } from "../../lib/rateLimit.js";
import { isTrapped } from "../../lib/formGuard.js";
import { requestSubscription } from "../../lib/subscribers.js";
import { sendNewsletterConfirmRequest } from "../../lib/email.js";
import { email as validEmail } from "../../lib/validate.js";

// The newsletter signup. It is a public form, so it is the target of
// "subscription bombing": bots type real people's addresses into forms to bury
// them in confirmation mail. Defences, in layers:
//   - hidden trap field and minimum fill time (lib/formGuard.js);
//   - request limits per network address, per email address and overall;
//   - one confirmation email per address per 24 hours (lib/subscribers.js);
//   - the reply never says whether an address was new, so the form cannot be used
//     to find out who is on the list.
// Nobody is subscribed by this request. The owner of the address is, by clicking
// the link in the confirmation email (controllers/newsletter/confirm.js).

export const limits = {
  perIp: createLimiter({ windowMs: 60 * 60 * 1000, max: 5 }),
  perEmail: createLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 3 }),
  global: createLimiter({ windowMs: 60 * 60 * 1000, max: 60 }),
};

const MESSAGE = "Almost done. If that address can receive mail, we have sent a message with a link to confirm your subscription.";
const OK = { data: { success: true, message: MESSAGE } };

export const subscribe = handle(async (c) => {
  if (!limits.global.take("all") || !limits.perIp.take(clientIp(c))) {
    throw new HttpError(429, "RATE_LIMITED", "Too many requests. Please try again later.");
  }
  const body = await readJson(c, 4 * 1024);
  if (isTrapped(body)) return c.json(OK);

  const address = validEmail(body.email, "Email");
  // Over the per-address limit: same reply, nothing sent.
  if (!limits.perEmail.take(address)) return c.json(OK);

  const { subscriber, sendConfirmation } = await requestSubscription(address);
  if (sendConfirmation) {
    // Not awaited: the visitor should not wait on the mail provider.
    sendNewsletterConfirmRequest(address, subscriber._id).catch((err) =>
      console.error("[Newsletter] Confirmation request failed:", err?.message ?? err),
    );
  }
  return c.json(OK);
});
