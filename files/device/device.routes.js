const deviceRoute = require("express").Router();
const { isAuthenticated } = require("../../utils");
const {
  createDeviceController,
  getDeviceController,
  updateDeviceController,
  deleteDeviceController,
} = require("./device.controller");

//authenticated routes go below here
deviceRoute.use(isAuthenticated);

deviceRoute.post("/", createDeviceController);
deviceRoute.get("/", getDeviceController);
deviceRoute.put("/:id", updateDeviceController);
deviceRoute.delete("/:id", deleteDeviceController);

module.exports = deviceRoute;
