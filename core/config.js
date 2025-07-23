const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "../.env") });

module.exports.config = {
  PORT: process.env.PORT,
  MONGO_URL: process.env.MONGO_URL,
  REDIS_URL: process.env.REDIS_URL,
  BASE_URL:
    process.env.BASE_URL || `http://localhost:${process.env.PORT || 5007}`,
  TERMII_BASE_URL: process.env.TERMII_BASE_URL,
  TERMII_KEY: process.env.TERMII_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_NAME: process.env.CLOUDINARY_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  PAYSTACK_URL: process.env.PAYSTACK_BASE_URL,
  PAYSTACK_KEY: process.env.PAYSTACK_SK_KEY,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  FRONTEND_URL: process.env.FRONTEND_URL,
  PAYSTACK_CALLBACK_URL: process.env.PAYSTACK_CALLBACK_URL,
  TOKEN_EXPIRE_IN: process.env.TOKEN_EXPIRE_IN,
  COMPANY_EMAIL: process.env.COMPANY_EMAIL,
  COMPANY_EMAIL_PASSWORD: process.env.COMPANY_EMAIL_PASSWORD,
};
