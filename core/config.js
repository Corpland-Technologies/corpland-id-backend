const dotenv = require("dotenv")
const path = require("path")
dotenv.config({ path: path.join(__dirname, "../.env") })

module.exports.config = {
  PORT: process.env.PORT,
  MONGO_URL: process.env.MONGO_URL,
  REDIS_URL: process.env.REDIS_URL,
  TERMII_BASE_URL: process.env.TERMII_BASE_URL,
  TERMII_KEY: process.env.TERMII_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_NAME: process.env.CLOUDINARY_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  PAYSTACK_URL: process.env.PAYSTACK_BASE_URL,
  PAYSTACK_KEY: process.env.PAYSTACK_SK_KEY,
}
