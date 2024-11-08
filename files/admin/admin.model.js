const mongoose = require("mongoose")

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    password: {
      type: String,
    },
    image: String,
    location: String,
    isDelete: {
      type: Boolean,
      default: false,
    },
    accountDetails:{
      accountName: String,
      accountNumber: String,
      bankName: String,
      accountType: String
    }
  },
  { timestamps: true }
)

const admin = mongoose.model("Admin", adminSchema, "admin")

module.exports = { Admin: admin }
