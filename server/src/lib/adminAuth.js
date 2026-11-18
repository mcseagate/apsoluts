import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Admin sign-in for the subscriber list.
//
// Three environment variables configure it and none has a default: with any of
// them missing, sign-in is refused rather than falling back to a known value.
//   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_TOKEN_SECRET (32+ random characters)
//
// A token is `<base64url payload>.<base64url HMAC-SHA256>`; the payload holds
// only an expiry. Nothing is stored server-side, so changing ADMIN_TOKEN_SECRET
// signs every admin out.

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const b64url = (buf) => Buffer.from(buf).toString("base64url");

function sign(body) {
  return createHmac("sha256", process.env.ADMIN_TOKEN_SECRET).update(body).digest("base64url");
}

// Compare through a hash so the lengths always match and timing reveals nothing.
function safeEqual(a, b) {
  const ha = createHash("sha256").update(String(a)).digest();
  const hb = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

export function adminConfigured() {
  return Boolean(
    process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_TOKEN_SECRET &&
      process.env.ADMIN_TOKEN_SECRET.length >= 32,
  );
}

export function checkCredentials(email, password) {
  // Evaluate both so a wrong email takes as long as a wrong password.
  const emailOk = safeEqual(String(email).trim().toLowerCase(), process.env.ADMIN_EMAIL.trim().toLowerCase());
  const passwordOk = safeEqual(password, process.env.ADMIN_PASSWORD);
  return emailOk && passwordOk;
}

export function issueToken() {
  const body = b64url(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS }));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token) {
  if (!adminConfigured() || typeof token !== "string") return false;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return false;
  if (!safeEqual(signature, sign(body))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export function bearerToken(header) {
  const match = /^Bearer\s+(.+)$/i.exec(header || "");
  return match ? match[1] : "";
}
