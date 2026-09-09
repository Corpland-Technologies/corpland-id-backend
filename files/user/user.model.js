const mongoose = require("mongoose");
const { DEFAULT_USER_IMAGE, authProviders } = require("../../constants/index");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      default: DEFAULT_USER_IMAGE,
    },
    googleId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: Object.values(authProviders),
      default: authProviders.LOCAL,
    },
    providers: {
      type: [{ type: String, enum: Object.values(authProviders) }],
      default: [],
    },
    lastSignInProvider: {
      type: String,
      enum: Object.values(authProviders),
    },
    lastSignInAt: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    dateOfBirth: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    termsAndConditions: {
      type: Boolean,
      default: true,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const user = mongoose.model("User", userSchema, "users");

module.exports = { User: user };
