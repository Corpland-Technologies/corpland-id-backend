const { application, app } = require("./app");
const dotenv = require("dotenv");
const path = require("path");
const connectToDatabase = require("./db");
const { config } = require("./config");
const { redis } = require("../utils/redis");
const { keepServerAlive } = require("../utils/cron");

dotenv.config({ path: path.join(__dirname, "../.env") });

const port = config.PORT || 5007;

const startServer = () => {
  application();

  connectToDatabase().catch((error) => {
    console.error("Failed to connect to the database:", error.message);
  });

  //redis server
  redis.on("connect", function () {
    console.log("Connected to redis instance");
  });

  redis.on("error", function (e) {
    console.log("Error connecting to redis", e);
  });

  app.listen(port, () => {
    console.log(`Application running on port ${port}`);
  });

  process.on("unhandledRejection", (err) => {
    console.error("Unhandled rejection:", err?.message || err);
  });

  process.on("uncaughtException", (err) => {
    console.log(err.message);
    process.exit(1);
  });
};

module.exports = startServer;
