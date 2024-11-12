const adminRoute = require("../files/admin/admin.routes");
const authRoute = require("../files/auth/auth.route");
const deviceRoute = require("../files/device/device.routes");

const routes = (app) => {
  const base_url = "/api/v1";

  app.use(`${base_url}/admin`, adminRoute);
  app.use(`${base_url}/auth`, authRoute);
  app.use(`${base_url}/devices`, deviceRoute);
};

module.exports = routes;
