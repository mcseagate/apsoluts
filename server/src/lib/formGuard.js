import { HttpError } from "./http.js";

// The anti-bot checks shared by the public forms (the quote form has its own copy
// of the same idea). None of them asks the visitor to solve anything:
//   - a hidden "website" field that people never see and bots usually fill in;
//   - a minimum time between the form appearing and being sent.
// A request that trips either gets the normal success reply and is dropped, so a
// bot learns nothing about why it failed.

export const MIN_FILL_MS = 2500;

// Returns true when the submission should be silently dropped. Throws a 400 when
// the request does not come from our form at all (no timer value).
export function isTrapped(body) {
  if (typeof body.website === "string" && body.website.trim() !== "") return true;
  if (typeof body.elapsedMs !== "number" || !Number.isFinite(body.elapsedMs)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Please send this request from the form on our site.");
  }
  return body.elapsedMs < MIN_FILL_MS;
}

// A free-text message needs to read like writing: a few letters in a row. This
// drops digit-only and symbol-only floods without judging real messages.
export const looksLikeWriting = (s) => /\p{L}{3,}/u.test(s);
