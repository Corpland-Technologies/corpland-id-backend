const cron = require("node-cron");
const axios = require("axios");
const { config } = require("../core/config");

// Self-ping function to keep the server alive
const pingServer = async () => {
  try {
    const response = await axios.get(`${config.BASE_URL}`);
    console.log("Server pinged successfully:", response.status);
  } catch (error) {
    console.error("Error pinging server:", error.message);
  }
};

// Schedule the ping every 1 minute (Render free tier sleeps after 15 minutes of inactivity)
const keepServerAlive = () => {
  cron.schedule("*/1 * * * *", async () => {
    await pingServer();
  });
};


module.exports = { keepServerAlive };
