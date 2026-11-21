import { Types } from "mongoose";
import { badRequest } from "./http.js";

// Plain validators. Each returns the cleaned value or throws a 400 that names the field.

// Control characters other than tab and newline are removed; they have no place
// in any text field here and can break emails and logs.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function text(value, field, { min = 0, max, optional = false, multiline = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (optional) return "";
    throw badRequest(`${field} is required.`);
  }
  if (typeof value !== "string") throw badRequest(`${field} must be text.`);
  let v = value.replace(CONTROL, "").trim();
  if (!multiline) v = v.replace(/\s+/g, " ");
  if (v.length < min) throw badRequest(`${field} must be at least ${min} characters.`);
  if (v.length > max) throw badRequest(`${field} must be at most ${max} characters.`);
  if (!v && !optional) throw badRequest(`${field} is required.`);
  return v;
}

const EMAIL = /^[^\s@<>(),;:"\\]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function email(value, field = "Email") {
  const v = text(value, field, { max: 254 }).toLowerCase();
  if (!EMAIL.test(v)) throw badRequest(`Enter a valid ${field.toLowerCase()} address.`);
  return v;
}

export function objectId(value, field = "id") {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/i.test(value)) throw badRequest(`${field} is not valid.`);
  return new Types.ObjectId(value);
}

export function oneOf(value, allowed, field) {
  if (!allowed.includes(value)) throw badRequest(`${field} must be one of: ${allowed.join(", ")}.`);
  return value;
}

// A real calendar date as YYYY-MM-DD.
export function dateString(value, field = "Date") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw badRequest(`${field} must be a date like 2026-12-31.`);
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw badRequest(`${field} is not a real date.`);
  return value;
}

export const todayUtc = (now = new Date()) => now.toISOString().slice(0, 10);

export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function intInRange(value, field, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw badRequest(`${field} must be a whole number from ${min} to ${max}.`);
  return value;
}
