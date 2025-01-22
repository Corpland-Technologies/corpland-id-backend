const { BAD_REQUEST, SUCCESS } = require("../../constants/statusCode");
const { responseHandler } = require("../../core/response");
const { manageAsyncOps, fileModifier } = require("../../utils");
const { CustomError } = require("../../utils/errors");
const { PaymentService } = require("./payment.service");

const createPaymentController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(PaymentService.createPayment(req));
  console.log("error", error);
  if (error) return console.log(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const getAllPaymentsController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(PaymentService.getAllPayments());

  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const getPaymentController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    PaymentService.getPayment(req.query, res.locals.jwt)
  );
  console.log("error", error);
  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const updatePaymentController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    PaymentService.updatePayment(req.params.id, req.body)
  );

  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const deletePaymentController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    PaymentService.deletePayment(req.params.id)
  );

  if (error) return next(error);

  if (!data.success)
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

const verifyPaymentController = async (req, res, next) => {
  const [error, data] = await manageAsyncOps(
    PaymentService.verifyPayment(req.params.reference)
  );

  if (error) return next(error);

  if (!data.success) 
    return next(new CustomError(data.message, BAD_REQUEST, data));

  return responseHandler(res, SUCCESS, data);
};

module.exports = {
  createPaymentController,
  getPaymentController,
  updatePaymentController,
  deletePaymentController,
  getAllPaymentsController,
  verifyPaymentController,
};
