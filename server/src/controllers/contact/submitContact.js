import { sendContactEmail } from "../../lib/email.js";
import { clientIp, handle, HttpError, readJson, badRequest } from "../../lib/http.js";
import { createLimiter } from "../../lib/rateLimit.js";
import { isTrapped, looksLikeWriting } from "../../lib/formGuard.js";
import { email as validEmail, text } from "../../lib/validate.js";

// The contact form on the home page. It is public and the message goes to our own
// inbox with the sender's address as Reply-To, so bots use it two ways: to flood
// the inbox, and to put real people's addresses in front of us. Defences:
//   - hidden trap field and minimum fill time (lib/formGuard.js), answered with
//     the normal success reply so a bot learns nothing;
//   - request limits per network address, per email address and overall;
//   - length limits and a message that has to read like writing, not digits.

export const limits = {
  perIp: createLimiter({ windowMs: 60 * 60 * 1000, max: 5 }),
  perEmail: createLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 3 }),
  global: createLimiter({ windowMs: 60 * 60 * 1000, max: 60 }),
};

const OK = { data: { success: true, message: "Thank you for your message. We'll get back to you shortly." } };

export const submitContact = handle(async (c) => {
  if (!limits.global.take("all") || !limits.perIp.take(clientIp(c))) {
    throw new HttpError(429, "RATE_LIMITED", "Too many requests. Please try again later.");
  }
  const body = await readJson(c, 16 * 1024);
  if (isTrapped(body)) return c.json(OK);

  const message = {
    fullName: text(body.fullName, "Full name", { min: 2, max: 100 }),
    email: validEmail(body.email, "Email"),
    phone: text(body.phone, "Phone", { max: 40, optional: true }) || undefined,
    message: text(body.message, "Message", { min: 10, max: 5000, multiline: true }),
  };
  if (!looksLikeWriting(message.message) || !looksLikeWriting(message.fullName)) {
    throw badRequest("Please write your name and a short message in words.");
  }
  if (!limits.perEmail.take(message.email)) {
    throw new HttpError(429, "RATE_LIMITED", "We already have your recent messages. We will be in touch soon.");
  }

  try {
    await sendContactEmail(message);
  } catch (err) {
    console.error("[Contact] Email send failed:", err);
    return c.json({ error: { message: "Failed to send message. Please try again.", code: "EMAIL_ERROR" } }, 500);
  }
  return c.json(OK);
});
