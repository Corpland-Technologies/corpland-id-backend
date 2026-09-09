const mongoose = require("mongoose");
const { config } = require("../core/config");
const { User } = require("../files/user/user.model");
const { authProviders } = require("../constants/index");

const run = async () => {
  await mongoose.connect(config.MONGO_URL, { serverSelectionTimeoutMS: 8000 });

  const local = await User.updateMany(
    {
      password: { $exists: true, $nin: [null, ""] },
      providers: { $ne: authProviders.LOCAL },
    },
    { $addToSet: { providers: authProviders.LOCAL } }
  );

  const google = await User.updateMany(
    {
      googleId: { $exists: true, $nin: [null, ""] },
      providers: { $ne: authProviders.GOOGLE },
    },
    { $addToSet: { providers: authProviders.GOOGLE } }
  );

  console.log(
    `providers backfilled: local +${local.modifiedCount}, google +${google.modifiedCount}`
  );

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
