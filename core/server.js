const { application, app } = require("./app");
const dotenv = require("dotenv");
const path = require("path");
const connectToDatabase = require("./db");
const { config } = require("./config");
const { redis } = require("../utils/redis");
const { rewardRider } = require("../utils/cron");

dotenv.config({ path: path.join(__dirname, "../.env") });

const port = config.PORT || 5007;

const startServer = () => {
  application();
  connectToDatabase();

  //cron job
  rewardRider();

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

  // Handle unhandled promise rejections and exceptions
  process.on("unhandledRejection", (err) => {
    console.log(err.message);
    process.exit(1);
  });

  process.on("uncaughtException", (err) => {
    console.log(err.message);
    process.exit(1);
  });
};

module.exports = startServer;
