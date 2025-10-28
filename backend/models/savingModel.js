import mongoose from "mongoose";

const savingSchema = new mongoose.Schema({
  memberName: String,
  amount: Number,
  target: { type: Number, default: 60000 },
  date: { type: Date, default: Date.now },
});
export const Saving = mongoose.model("Saving", savingSchema);