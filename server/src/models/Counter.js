import mongoose, { Schema } from "mongoose";

// Named sequences. Invoice numbers come from one, incremented atomically.
const CounterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });

export const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);
