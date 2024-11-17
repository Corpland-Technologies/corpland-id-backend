const mongoose = require("mongoose");

const DeviceSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ["ios", "android"],
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const device = mongoose.model("Device", DeviceSchema, "devices");

module.exports = { Device: device };
