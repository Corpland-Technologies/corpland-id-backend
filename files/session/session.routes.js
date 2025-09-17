const sessionRoute = require("express").Router();
const { isAuthenticated } = require("../../utils");
const {
  createSessionController,
  getSessionController,
  updateSessionController,
  getAllSessionsController,
  revokeSessionController,
  revokeAllSessionsController,
  refreshTokenController,
  logoutUserController,
} = require("./session.controller");

//authenticated routes go below here
// sessionRoute.use(isAuthenticated);

sessionRoute.post("/", createSessionController);
sessionRoute.get("/", getAllSessionsController);
sessionRoute.get("/:id", getSessionController);
sessionRoute.put("/:id", updateSessionController);
sessionRoute.delete("/:id", revokeSessionController);
sessionRoute.delete("/revoke-all/:id", revokeAllSessionsController);
sessionRoute.get("/auth/refresh-token", refreshTokenController);

sessionRoute.post("/logout", logoutUserController);

module.exports = sessionRoute;
