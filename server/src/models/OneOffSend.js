import mongoose, { Schema } from "mongoose";

// One row per (one-off message, recipient): the unique pair means a recipient is
// handed to the mail service at most once for a given one-off message, even if the
// script is interrupted and run again. Only a hash of the address is stored.
const OneOffSendSchema = new Schema({
  key: { type: String, required: true },
  emailHash: { type: String, required: true },
  status: { type: String, enum: ["sending", "sent", "failed"], default: "sending" },
  error: { type: String, default: "", maxlength: 80 },
  at: { type: Date, default: Date.now },
});
OneOffSendSchema.index({ key: 1, emailHash: 1 }, { unique: true });

export const OneOffSend = mongoose.models.OneOffSend || mongoose.model("OneOffSend", OneOffSendSchema);
