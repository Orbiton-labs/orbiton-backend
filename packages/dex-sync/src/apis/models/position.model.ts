import { Address } from "@ton/core";
import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    poolId: {
      type: mongoose.Types.ObjectId,
      ref: "Pool",
      required: true,
    },
    positionAddress: {
      type: String,
      required: true,
      unique: true,
      validate: function (data) {
        return Address.isFriendly(data) === true;
      },
    },
    tickLower: {
      type: Number,
      required: true,
    },
    tickUpper: {
      type: Number,
      required: true,
    },
    liquidity: {
      type: String,
      required: true,
      default: "0",
    },
    feeGrowthInside0LastX128: {
      type: String,
      required: true,
      default: "0",
    },
    feeGrowthInside1LastX128: {
      type: String,
      required: true,
      default: "0",
    },
    tokenOwed0: {
      type: String,
      required: true,
      default: "0",
    },
    tokenOwed1: {
      type: String,
      required: true,
      default: "0",
    },
    ownerAddress: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    _id: true,
  }
);

export default mongoose.model("Position", Schema);
