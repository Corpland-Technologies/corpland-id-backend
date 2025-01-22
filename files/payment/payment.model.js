const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    course: {
      type: String,
      required: true,
    },
    programOfStudy: {
      type: String,
      required: true,
    },
    referenceCode: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "success", "failed"],
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const payment = mongoose.model("Payment", PaymentSchema, "payments");

module.exports = { Payment: payment };
