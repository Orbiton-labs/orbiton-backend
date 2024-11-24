import { Address } from "@ton/core";
import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    poolAddress: {
      type: String,
      required: true,
      unique: true,
      validate: function (data) {
        return Address.isFriendly(data) === true;
      },
    },
    jetton0WalletAddress: {
      type: String,
      required: true,
    },
    jetton1WalletAddress: {
      type: String,
      required: true,
    },
    jetton0MasterAddress: {
      type: String,
      required: false,
    },
    jetton1MasterAddress: {
      type: String,
      required: false,
    },
    token0Amount: {
      type: String,
      required: true,
      default: "0",
    },
    token0USD: {
      type: String,
      required: true,
      default: "0",
    },
    token1Amount: {
      type: String,
      required: true,
      default: "0",
    },
    token1USD: {
      type: String,
      required: true,
      default: "0",
    },
    fee: {
      type: Number,
      required: true,
    },
    tickSpacing: {
      type: Number,
      required: true,
    },
    liquidity: {
      type: String,
      required: true,
      default: "0",
    },
    totalVolume: {
      type: String,
      required: true,
      default: "0",
    },
    totalFee: {
      type: String,
      required: true,
      default: "0",
    },
  },
  {
    timestamps: true,
    _id: true,
  }
);

export default mongoose.model("Pool", Schema);
