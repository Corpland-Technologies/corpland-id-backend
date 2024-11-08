const { manageAsyncOps, fileModifier } = require("../../utils/index");
const { AdminService } = require("./admin.service");
const { responseHandler } = require("../../core/response");
const { CustomError } = require("../../utils/errors");

const adminSignUpController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    AdminService.adminSignUpService(req.body)
  );
  if (error) return next(error);

  if (!data?.SUCCESS) return next(new CustomError(data.msg, 400, data));

  return responseHandler(res, 200, data);
};

const adminLogin = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    AdminService.adminLoginService(req.body)
  );
  console.log('err', error)

  if (error) return next(error);

  if (!data?.SUCCESS) return next(new CustomError(data.msg, 401, data));

  return responseHandler(res, 200, data);
};

const getAdminController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    AdminService.getAdminService(req.body)
  );
  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.msg, 400, data));

  return responseHandler(res, 200, data);
};

const getLoggedInAdminController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    AdminService.getLoggedInAdmin(res.locals.jwt)
  );

  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.msg, 400, data));

  return responseHandler(res, 200, data);
};

const updateAdminController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    AdminService.updateAdminService(req)
  );
  console.log('err', error)

  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.msg, 400, data));

  return responseHandler(res, 200, data);
};

const changeAdminPasswordController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    AdminService.changePassword(req.body)
  );
  console.log('error', error)
  if (error) return console.log(error);

  if (!data.SUCCESS) return next(new CustomError(data.msg, 400, data));

  return responseHandler(res, 200, data);
};

const imageUpload = async (req, res, next) => {
  let value = fileModifier(req);
  const [error, data] = await manageAsyncOps(
    AdminService.uploadImageService(value, res.locals.jwt)
  );

  if (error) return next(error);

  if (!data.success) return next(new CustomError(data.msg, 400, data));

  return responseHandler(res, 200, data);
};

const deleteAdminController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    AdminService.deleteAdminService(req)
  );
  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.msg, 400, data));

  return responseHandler(res, 200, data);
};

const searchAdminController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    AdminService.searchAdmin(req.query)
  );

  if (error) return console.log(error);

  if (!data.SUCCESS) return next(new CustomError(data.msg, 400, data));

  return responseHandler(res, 200, data);
};

module.exports = {
  adminSignUpController,
  adminLogin,
  updateAdminController,
  changeAdminPasswordController,
  imageUpload,
  getAdminController,
  getLoggedInAdminController,
  deleteAdminController,
  searchAdminController,
};
