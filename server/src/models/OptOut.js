import mongoose, { Schema } from "mongoose";

// Addresses that must not be emailed, whatever list they are on. Written when
// someone unsubscribes from a message sent to an address that is not a subscriber
// (for example a one-off message to a person who requested a quote). Every send
// path checks it. Signing up again and confirming removes the entry.
const OptOutSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  at: { type: Date, default: Date.now },
  source: { type: String, default: "unsubscribe", maxlength: 40 },
});

export const OptOut = mongoose.models.OptOut || mongoose.model("OptOut", OptOutSchema);
