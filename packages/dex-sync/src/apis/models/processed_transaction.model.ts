import { Address } from "@ton/core";
import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    transactionHash: {
      type: String,
      required: true,
    },
    messageIndex: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    _id: true,
  }
);

export default mongoose.model("ProcessedTransaction", Schema);
