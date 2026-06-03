import mongoose from "mongoose";

let isConnected = false;

export async function connectDb() {
  if (isConnected) return;

  const url = process.env.MONGO_DB_URL;
  if (!url) {
    throw new Error("MONGO_DB_URL environment variable is not defined");
  }

  try {
    await mongoose.connect(url);
    isConnected = true;
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}
