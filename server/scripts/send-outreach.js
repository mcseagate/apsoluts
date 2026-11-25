import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { OUTREACH_KEY, runOutreach } from "../src/campaigns/outreach.js";
import { unsubscribeConfigured } from "../src/campaigns/unsubscribe.js";
import { mailTransport } from "../src/lib/mailer.js";

// The one-off "what do you need, and how can we help?" message.
//
//   node scripts/send-outreach.js                     dry run: who would get it (masked), sends nothing
//   node scripts/send-outreach.js --test              sends only the owner's copy
//   node scripts/send-outreach.js --send              owner's copy, then everyone listed
//   --exclude=a@x.com,b@y.com                         addresses to leave out after reviewing the list
//
// Who is included is decided in src/campaigns/outreach.js. Re-running is safe: a
// recipient who already received this message is skipped.

try {
  process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env"));
} catch {
  // No .env file: rely on the environment.
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const mode = flag("send") ? "send" : flag("test") ? "test" : "dry-run";
const exclude = (value("exclude") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const from = process.env.CAMPAIGN_FROM?.trim() || undefined;

try {
  if (mode !== "dry-run") {
    if (!mailTransport()) throw new Error("Email is not configured (RESEND_API_KEY or SMTP_PASS).");
    if (!unsubscribeConfigured()) throw new Error("INVOICE_LINK_SECRET is not set, so opt-out links cannot be made.");
  }
  console.log(`Mode: ${mode}. Message key: ${OUTREACH_KEY}.`);
  const result = await runOutreach({ mode, exclude, from });
  console.log(JSON.stringify(result));
  if (mode === "dry-run") console.log("Nothing was sent. Add --test to send only the owner's copy, or --send to send for real.");
} catch (err) {
  console.error("Outreach failed:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
