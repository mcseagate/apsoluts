import { sendContactEmail } from "../../lib/email.js";

export async function submitContact(c) {
  let body;
  try {
    body = await c.req.json();
  } catch (err) {
    return c.json({ error: { message: "Invalid JSON", code: "PARSE_ERROR" } }, 400);
  }

  // Simple manual validation
  if (!body || !body.fullName || !body.email || !body.message) {
    return c.json({
      error: {
        message: "Validation failed. Full name, email, and message are required.",
        code: "VALIDATION_ERROR"
      }
    }, 400);
  }

  try {
    await sendContactEmail({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone || undefined,
      message: body.message,
    });
  } catch (err) {
    console.error("[Contact] Email send failed:", err);
    return c.json({ error: { message: "Failed to send message. Please try again.", code: "EMAIL_ERROR" } }, 500);
  }

  return c.json({ data: { success: true, message: "Thank you for your message. We'll get back to you shortly." } });
}
