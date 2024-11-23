import { Address } from "@ton/core";
import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      default: "jetton",
    },
    address: {
      type: String,
      required: true,
      unique: true,
      validate: function (data) {
        return Address.isFriendly(data) === true;
      },
    },
    name: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    image: {
      type: String,
      required: false,
    },
    decimals: {
      type: Number,
      required: true,
    },
    aliased: {
      type: Boolean,
      required: true,
    },
    price: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    _id: true,
  }
);

export default mongoose.model("Tokens", Schema);
