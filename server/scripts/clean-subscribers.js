import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { connectDb } from "../src/config/db.js";
import { OptOut } from "../src/models/OptOut.js";
import { Subscriber } from "../src/models/Subscriber.js";
import { maskEmail } from "../src/campaigns/outreach.js";

// Cleans the subscriber list after a flood of bot signups, and brings older
// subscribers under the confirmation rule.
//
//   node scripts/clean-subscribers.js                                  dry run: lists every subscriber (masked) and what would change
//   node scripts/clean-subscribers.js --bots=a@x.com,b@y.com --apply  removes those addresses from mailings
//   --grandfather-before=2026-11-25                                    treats subscribers who signed up before that date (and are not
//                                                                      in --bots) as confirmed
//
// Addresses are passed on the command line and are never stored in the repository.
// A bot address is marked unsubscribed (reason "bot signup") and added to the
// do-not-email list; the record is kept so the same address cannot be re-added
// quietly. Nothing is deleted. Nothing is sent.

try {
  process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env"));
} catch {
  // No .env file: rely on the environment.
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const apply = flag("apply");
const bots = new Set((value("bots") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
const cutoffText = value("grandfather-before");
const cutoff = cutoffText ? new Date(`${cutoffText}T00:00:00Z`) : null;
if (cutoffText && Number.isNaN(cutoff.getTime())) {
  console.error(`--grandfather-before must be a date like 2026-11-25 (got ${cutoffText}).`);
  process.exit(1);
}

try {
  await connectDb();
  const all = await Subscriber.find({}).sort({ createdAt: 1 }).lean();
  const known = new Set(all.map((s) => s.email));
  const missing = [...bots].filter((b) => !known.has(b));
  if (missing.length) console.log(`Not on the list (ignored): ${missing.map(maskEmail).join(", ")}`);

  const plan = all.map((s) => {
    let action = "leave";
    if (bots.has(s.email)) action = s.unsubscribedAt && s.suppressedReason === "bot signup" ? "already removed" : "REMOVE (bot signup)";
    else if (cutoff && !s.confirmedAt && !s.unsubscribedAt && s.createdAt < cutoff) action = "CONFIRM (signed up before cutoff)";
    return { s, action };
  });

  console.log(`${all.length} subscribers.`);
  for (const { s, action } of plan) {
    const state = s.unsubscribedAt ? "unsubscribed" : s.confirmedAt ? "confirmed" : "pending";
    console.log(`  ${maskEmail(s.email).padEnd(24)} ${s.createdAt.toISOString().slice(0, 16)}  ${state.padEnd(12)} -> ${action}`);
  }

  if (!apply) {
    console.log("Dry run: nothing changed. Add --apply to make these changes.");
  } else {
    let removed = 0;
    let confirmed = 0;
    for (const { s, action } of plan) {
      if (action.startsWith("REMOVE")) {
        await Subscriber.updateOne({ _id: s._id }, { $set: { unsubscribedAt: s.unsubscribedAt ?? new Date(), suppressedReason: "bot signup" } });
        await OptOut.updateOne({ email: s.email }, { $setOnInsert: { email: s.email, source: "bot", at: new Date() } }, { upsert: true });
        removed += 1;
      } else if (action.startsWith("CONFIRM")) {
        await Subscriber.updateOne({ _id: s._id }, { $set: { confirmedAt: new Date() } });
        confirmed += 1;
      }
    }
    console.log(`Applied: ${removed} removed from mailings, ${confirmed} confirmed.`);
  }
} catch (err) {
  console.error("Clean-up failed:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
