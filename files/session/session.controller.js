const { BAD_REQUEST, SUCCESS } = require("../../constants/statusCode");
const { responseHandler } = require("../../core/response");
const { manageAsyncOps, fileModifier } = require("../../utils");
const { CustomError } = require("../../utils/errors");
const { SessionService } = require("./session.service");

const createSessionController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(SessionService.createSession(req));
  console.log("error", error);
  if (error) return console.log(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const getAllSessionsController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(SessionService.getAllSessions());

  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const getSessionController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    SessionService.getSession(req.query, res.locals.jwt)
  );
  console.log("error", error);
  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const updateSessionController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    SessionService.updateSession(req.params.id, req.body)
  );

  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const revokeSessionController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    SessionService.revokeSession(req.params.id)
  );

  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const revokeAllSessionsController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    SessionService.revokeAllSessions(req.params.id)
  );

  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const refreshTokenController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(SessionService.refreshToken(req));

  if (error) return console.log(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

module.exports = {
  createSessionController,
  getSessionController,
  updateSessionController,
  revokeSessionController,
  getAllSessionsController,
  revokeAllSessionsController,
  refreshTokenController,
};
