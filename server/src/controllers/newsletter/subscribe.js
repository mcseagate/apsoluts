import { addSubscriber } from "../../lib/subscribers.js";
import { sendNewsletterConfirmation, sendNewsletterAdminNotification } from "../../lib/email.js";

export async function subscribe(c) {
  let body;
  try {
    body = await c.req.json();
  } catch (err) {
    return c.json({ error: { message: "Invalid JSON", code: "PARSE_ERROR" } }, 400);
  }

  if (!body || !body.email || typeof body.email !== "string" || !body.email.includes("@")) {
    return c.json({ error: { message: "Validation error. A valid email is required.", code: "VALIDATION_ERROR" } }, 400);
  }

  const email = body.email;
  console.log(`[Newsletter] New subscription request for: ${email}`);
  const { added } = await addSubscriber(email);

  if (!added) {
    console.log(`[Newsletter] ${email} is already subscribed. Skipping email confirmation.`);
    return c.json({ data: { success: true, message: "You're already subscribed. We'll keep you updated!" } });
  }

  console.log(`[Newsletter] Successfully added ${email} to database. Triggering confirmation email...`);
  // Send confirmation async (don't block response)
  sendNewsletterConfirmation(email)
    .then(() => console.log(`[Newsletter] Confirmation flow completed for ${email}`))
    .catch((err) =>
      console.error("[Newsletter] Confirmation email failed:", err)
    );

  // Send admin notification async
  sendNewsletterAdminNotification(email)
    .then(() => console.log(`[Newsletter] Admin notification flow completed for ${email}`))
    .catch((err) =>
      console.error("[Newsletter] Admin notification email failed:", err)
    );

  return c.json({ data: { success: true, message: "You're subscribed! Check your inbox for a confirmation." } });
}
