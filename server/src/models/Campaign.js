import mongoose, { Schema } from "mongoose";

// One row per day a campaign email went out. The unique `key` (the UTC date) is
// what stops two runs, or two server instances, from sending the same day twice.
const CampaignSchema = new Schema(
  {
    key: { type: String, required: true, unique: true }, // YYYY-MM-DD
    sequence: { type: Number, required: true },
    kind: { type: String, enum: ["regular", "holiday"], required: true },
    topic: { type: String, required: true },
    offerCode: { type: String, default: null },
    subject: { type: String, required: true },
    status: { type: String, enum: ["sending", "done"], default: "sending" },
    counts: {
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    startedAt: { type: Date, default: Date.now },
    finishedAt: Date,
  },
  { timestamps: false },
);

export const Campaign = mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema);
