export async function login(c) {
  let body;
  try {
    body = await c.req.json();
  } catch (err) {
    return c.json({ error: { message: "Invalid JSON", code: "PARSE_ERROR" } }, 400);
  }

  const { email, password } = body || {};

  if (!email || !password) {
    return c.json({
      error: {
        message: "Email and password are required.",
        code: "VALIDATION_ERROR"
      }
    }, 400);
  }

  const adminEmail = process.env.SMTP_USER || "contact@apsoluts.com";
  const adminPassword = process.env.SMTP_PASS || "Admin2much3@";

  if (email === adminEmail && password === adminPassword) {
    return c.json({
      data: {
        success: true,
        token: "apsoluts-admin-session-token",
        message: "Logged in successfully"
      }
    });
  }

  return c.json({
    error: {
      message: "Invalid email or password.",
      code: "UNAUTHORIZED"
    }
  }, 401);
}
