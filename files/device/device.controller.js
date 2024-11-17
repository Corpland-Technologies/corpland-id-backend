const { BAD_REQUEST, SUCCESS } = require("../../constants/statusCode");
const { responseHandler } = require("../../core/response");
const { manageAsyncOps, fileModifier } = require("../../utils");
const { CustomError } = require("../../utils/errors");
const { DeviceService } = require("./device.service");

const createDeviceController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(DeviceService.createDevice(req));
  console.log("error", error);
  if (error) return console.log(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const getAllDevicesController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(DeviceService.getAllDevices());

  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const getDeviceController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    DeviceService.getDevice(req.query, res.locals.jwt)
  );
  console.log("error", error);
  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const updateDeviceController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    DeviceService.updateDevice(req.params.id, req.body)
  );

  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const deleteDeviceController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    DeviceService.deleteDevice(req.params.id)
  );

  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

module.exports = {
  createDeviceController,
  getDeviceController,
  updateDeviceController,
  deleteDeviceController,
  getAllDevicesController,
};
