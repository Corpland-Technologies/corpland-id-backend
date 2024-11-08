const cron = require("node-cron");
// const { TripsService } = require("../files/trips/trips.service")

//Schedule the rewardRiders function to run every day at 12:00 AM
module.exports.rewardRider = async () => {
  // cron.schedule('*/5 * * * *', async () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("Running rewardRiders function...");
    // await  TripsService.rewardRiders();
  });
};
