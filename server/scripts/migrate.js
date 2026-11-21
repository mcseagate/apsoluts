import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import mongoose from "mongoose";
import { connectDb } from "../src/config/db.js";

// Runs the files in server/migrations in name order, each once. Applied
// migrations are recorded in the schema_migrations collection, so running this
// again (for example on every deploy) does nothing new.
//
//   npm run migrate
//
// Locally it reads server/.env; on Render there is no .env file and the
// service's environment variables are used as they are (a variable that is
// already set is never overridden by the file).

try {
  process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env"));
} catch {
  // No .env file: rely on the environment.
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");

export async function migrate(log = console.log) {
  await connectDb();
  const applied = mongoose.connection.collection("schema_migrations");
  const files = readdirSync(dir).filter((f) => /^\d+_.+\.js$/.test(f)).sort();
  let ran = 0;
  for (const file of files) {
    if (await applied.findOne({ _id: file })) continue;
    const mod = await import(pathToFileURL(path.join(dir, file)).href);
    log(`Applying ${file}: ${mod.description ?? ""}`);
    await mod.up();
    await applied.insertOne({ _id: file, appliedAt: new Date() });
    ran += 1;
  }
  log(ran ? `Applied ${ran} migration(s).` : "Nothing to apply.");
  return ran;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate()
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error("Migration failed:", err.message);
      process.exit(1);
    });
}
