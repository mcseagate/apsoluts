import { bearerToken, verifyToken } from "../lib/adminAuth.js";

// Every /api/admin route sits behind this. The token is checked on the server on
// every request; the admin screens in the browser only decide what to display.
export async function requireAdmin(c, next) {
  if (!verifyToken(bearerToken(c.req.header("Authorization")))) {
    return c.json({ error: { message: "Unauthorized access.", code: "UNAUTHORIZED" } }, 401);
  }
  c.header("Cache-Control", "no-store");
  await next();
}
