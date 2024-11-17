const { SUCCESS, BAD_REQUEST } = require("../../../constants/statusCode");
const { responseHandler } = require("../../../core/response");
const { manageAsyncOps } = require("../../../utils");
const { CustomError } = require("../../../utils/errors");
const AuthService = require("../auth.service");

const sendOtpController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(AuthService.sendOtp(req.body));
  console.log("error", error);
  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const verifyOtpController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(AuthService.verifyOtp(req.body));

  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const resetPasswordController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    AuthService.riderResetPassword(req.body)
  );
  console.log("error", error);
  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const merchantResetPasswordController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    AuthService.merchantResetPassword(req.body)
  );
  console.log("error", error);
  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const customerResetPasswordController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    AuthService.customerResetPassword(req.body)
  );
  console.log("error", error);
  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const enterpriseResetPasswordController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    AuthService.enterpriseResetPassword(req.body)
  );
  console.log("error", error);
  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};
const resetAdminPasswordController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    AuthService.resetAdminPassword(req.body)
  );

  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};
const logoutController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    AuthService.userLogOut(req.headers.authorization)
  );

  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

module.exports = {
  sendOtpController,
  verifyOtpController,
  resetPasswordController,
  resetAdminPasswordController,
  logoutController,
  merchantResetPasswordController,
  customerResetPasswordController,
  enterpriseResetPasswordController,
};
