const mongoose = require("mongoose")
const { config } = require("./config")

const CONNECTION_OPTIONS = {
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
  socketTimeoutMS: 20000,
  maxPoolSize: 10,
  maxIdleTimeMS: 60000,
}

const connectToDatabase = async () => {
  mongoose.set("strictQuery", false)

  if (!global.__mongooseConnection) {
    mongoose.connection.on("connected", () => {
      console.log("Database Connected")
    })

    mongoose.connection.on("error", (error) => {
      console.error("Database connection error:", error.message)
    })

    global.__mongooseConnection = mongoose
      .connect(`${config.MONGO_URL}`, CONNECTION_OPTIONS)
      .catch((error) => {
        global.__mongooseConnection = undefined
        throw error
      })
  }

  await global.__mongooseConnection

  return { conn: mongoose.connection }
}

module.exports = connectToDatabase
