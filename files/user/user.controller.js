const { manageAsyncOps, fileModifier } = require("../../utils/index");
const { UserService } = require("./user.service");
const { responseHandler } = require("../../core/response");
const { CustomError } = require("../../utils/errors");

const userSignUpController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.userSignUpService(req.body)
  );

  if (error) return next(error);

  if (!data?.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, 200, data);
};

const userLogin = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.userLoginService(req.body)
  );
  console.log("err", error);

  if (error) return next(error);

  if (!data?.SUCCESS) return next(new CustomError(data.message, 401, data));

  return responseHandler(res, 200, data);
};

const getUserController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.getUserService(req.body)
  );
  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, 200, data);
};

const getLoggedInUserController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.getLoggedInUser(res.locals.jwt)
  );

  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, 200, data);
};

const updateUserController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.updateUserService(req)
  );
  console.log("err", error);

  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, 200, data);
};

const changeUserPasswordController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.changePassword(req.body)
  );
  console.log("error", error);
  if (error) return console.log(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, 200, data);
};

const imageUpload = async (req, res, next) => {
  let value = fileModifier(req);
  const [error, data] = await manageAsyncOps(
    UserService.uploadImageService(value, res.locals.jwt)
  );

  if (error) return next(error);

  if (!data.success) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, 200, data);
};

const deleteUserController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    UserService.deleteUserService(req)
  );
  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, 200, data);
};

const searchUserController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(UserService.searchUser(req.query));

  if (error) return console.log(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, 200, data);
};

const verifyEmailController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(UserService.verifyEmail(req.body));
  if (error) return next(error);

  if (!data.SUCCESS) return next(new CustomError(data.message, 400, data));

  return responseHandler(res, 200, data);
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
};
