import mongoose, { Schema } from "mongoose";

// One row per (campaign, subscriber). The unique pair means a subscriber is
// handed to the mail service at most once for a given day's campaign, even if the
// job is interrupted and runs again. No email address is stored here.
const CampaignSendSchema = new Schema(
  {
    campaignKey: { type: String, required: true },
    subscriberId: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ["sending", "sent", "failed"], default: "sending" },
    error: { type: String, maxlength: 80, default: "" },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false },
);
CampaignSendSchema.index({ campaignKey: 1, subscriberId: 1 }, { unique: true });

export const CampaignSend = mongoose.models.CampaignSend || mongoose.model("CampaignSend", CampaignSendSchema);
