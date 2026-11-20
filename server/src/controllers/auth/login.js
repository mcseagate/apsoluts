import { adminConfigured, checkCredentials, issueToken } from "../../lib/adminAuth.js";

export async function login(c) {
  let body;
  try {
    body = await c.req.json();
  } catch (err) {
    return c.json({ error: { message: "Invalid JSON", code: "PARSE_ERROR" } }, 400);
  }

  const { email, password } = body || {};

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return c.json({
      error: {
        message: "Email and password are required.",
        code: "VALIDATION_ERROR"
      }
    }, 400);
  }

  if (!adminConfigured()) {
    console.error("[Auth] ADMIN_EMAIL, ADMIN_PASSWORD or ADMIN_TOKEN_SECRET (32+ chars) is not set; admin sign-in is disabled.");
    return c.json({
      error: {
        message: "Admin sign-in is not configured.",
        code: "NOT_CONFIGURED"
      }
    }, 503);
  }

  if (!checkCredentials(email, password)) {
    return c.json({
      error: {
        message: "Invalid email or password.",
        code: "UNAUTHORIZED"
      }
    }, 401);
  }

  return c.json({
    data: {
      success: true,
      token: issueToken(),
      message: "Logged in successfully"
    }
  });
}
