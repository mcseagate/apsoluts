import { Campaign } from "../src/models/Campaign.js";
import { CampaignSend } from "../src/models/CampaignSend.js";

// Collections and unique indexes for the scheduled campaign emails:
//   campaigns.key                         one campaign per calendar day
//   campaignsends (campaignKey, subscriberId)   one send per subscriber per campaign
export const description = "Campaign collections and indexes";

export async function up() {
  for (const model of [Campaign, CampaignSend]) {
    await model.createCollection().catch((err) => {
      if (err?.codeName !== "NamespaceExists" && err?.code !== 48) throw err;
    });
    await model.createIndexes();
  }
}
