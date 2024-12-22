const adminRoute = require("../files/admin/admin.routes");
const authRoute = require("../files/auth/auth.route");
const userRoute = require("../files/user/user.routes");
const sessionRoute = require("../files/session/session.routes");

const routes = (app) => {
  const base_url = "/api/v1";

  app.use(`${base_url}/admin`, adminRoute);
  app.use(`${base_url}/auth`, authRoute);
  app.use(`${base_url}/users`, userRoute);
  app.use(`${base_url}/session`, sessionRoute);
};

module.exports = routes;
