import { OneOffSend } from "../src/models/OneOffSend.js";
import { OptOut } from "../src/models/OptOut.js";

// The do-not-email list and the send log for one-off messages.
//   optouts.email                         unique
//   oneoffsends (key, emailHash)          unique: one send per recipient per message
export const description = "Opt-out list and one-off send log";

export async function up() {
  for (const model of [OptOut, OneOffSend]) {
    await model.createCollection().catch((err) => {
      if (err?.codeName !== "NamespaceExists" && err?.code !== 48) throw err;
    });
    await model.createIndexes();
  }
}
