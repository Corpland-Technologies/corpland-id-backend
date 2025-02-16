const { manageAsyncOps, fileModifier } = require("../../utils/index");
const { UserService } = require("./user.service");
const { responseHandler } = require("../../core/response");
const { CustomError } = require("../../utils/errors");
const { SUCCESS, BAD_REQUEST } = require("../../constants/statusCode");

const userSignUpController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.userSignUpService(req.body, res)
  );

  if (error) return next(error);

  if (!data?.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, SUCCESS, data);
};

const userLogin = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.userLoginService(req.body, res)
  );
  console.log("err", error);

  if (error) return next(error);

  if (!data?.SUCCESS) return next(new CustomError(data.message, 401, data));

  return responseHandler(res, SUCCESS, data);
};

const getUserController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.getUserService(req.body)
  );
  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, SUCCESS, data);
};

const getLoggedInUserController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.getLoggedInUser(res.locals.jwt)
  );

  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, SUCCESS, data);
};

const updateUserController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.updateUserService(req)
  );
  console.log("err", error);

  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, SUCCESS, data);
};

const changeUserPasswordController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.changePassword(req.body)
  );
  console.log("error", error);
  if (error) return console.log(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, SUCCESS, data);
};

const imageUpload = async (req, res, next) => {
  let value = fileModifier(req);
  const [error, data] = await manageAsyncOps(
    UserService.uploadImageService(value, res.locals.jwt)
  );

  if (error) return next(error);

  if (!data.success) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, SUCCESS, data);
};

const deleteUserController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.deleteUserService(req)
  );
  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, SUCCESS, data);
};

const searchUserController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(UserService.searchUser(req.query));

  if (error) return console.log(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, SUCCESS, data);
};

const verifyEmailController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(UserService.verifyEmail(req.body));
  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, SUCCESS, data);
};

const forgotPasswordController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.forgotPasswordService(req.body)
  );

  if (error) return next(error);

  if (!data.SUCCESS)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const verifyResetCodeController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.verifyResetCodeService(req.body)
  );

  if (error) return next(error);

  if (!data.SUCCESS)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const resetPasswordController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.resetPasswordService(req.body)
  );

  if (error) return next(error);

  if (!data.SUCCESS)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const getAllUsersController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.getAllUsersService(req.query)
  );

  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, SUCCESS, data);
};

const requestAccountDeletionController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.requestAccountDeletion(req.body, res.locals.jwt)
  );

  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  // Log the user out by clearing the refresh token cookie
  res.clearCookie("refreshToken");

  return responseHandler(res, SUCCESS, data);
};

module.exports = {
  userSignUpController,
  userLogin,
  updateUserController,
  changeUserPasswordController,
  imageUpload,
  getUserController,
  getLoggedInUserController,
  deleteUserController,
  searchUserController,
  verifyEmailController,
  forgotPasswordController,
  verifyResetCodeController,
  resetPasswordController,
  getAllUsersController,
  requestAccountDeletionController,
};
