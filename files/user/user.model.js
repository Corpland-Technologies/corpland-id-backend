const mongoose = require("mongoose")

const userSchema = new mongoose.Schema(
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
    image: {
      type: String, 
      default: "https://res.cloudinary.com/drwzb6vqn/image/upload/v1728840516/corpland/e5djtacomvpbubqwxhdy.png"
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

const user = mongoose.model("User", userSchema, "users")

module.exports = { User: user }
