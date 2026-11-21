// Small helpers shared by the billing controllers.

export class HttpError extends Error {
  constructor(status, code, message, extra) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const badRequest = (message, extra) => new HttpError(400, "VALIDATION_ERROR", message, extra);
export const notFound = (message = "Not found.") => new HttpError(404, "NOT_FOUND", message);
export const conflict = (code, message, extra) => new HttpError(409, code, message, extra);

// Wraps a controller so an HttpError becomes the app's { error: { message, code } }
// response and anything else falls through to the global error handler (which
// logs it and answers 500).
export const handle = (fn) => async (c) => {
  try {
    return await fn(c);
  } catch (err) {
    if (err instanceof HttpError) {
      return c.json({ error: { message: err.message, code: err.code, ...(err.extra ?? {}) } }, err.status);
    }
    throw err;
  }
};

// Reads a JSON object body of at most maxBytes. The size is checked on the text
// that was actually read, because a Content-Length header can lie or be absent.
export async function readJson(c, maxBytes = 64 * 1024) {
  const declared = Number(c.req.header("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Request is too large.");
  let text;
  try {
    text = await c.req.text();
  } catch {
    throw new HttpError(400, "PARSE_ERROR", "Invalid request body.");
  }
  if (Buffer.byteLength(text) > maxBytes) throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Request is too large.");
  if (!text) return {};
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, "PARSE_ERROR", "Invalid JSON");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw badRequest("Expected a JSON object.");
  return body;
}

// The client address as best the proxies report it. Behind Vercel and Render the
// header is appended to along the way, so the leftmost entry can be forged by
// the visitor: callers must treat this as a hint for rate limiting, never as an
// identity.
export function clientIp(c) {
  const forwarded = c.req.header("x-forwarded-for") || "";
  const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[0] || c.req.header("x-real-ip") || "unknown";
}
