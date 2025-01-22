const paymentRoute = require("express").Router();
const { isAuthenticated } = require("../../utils");
const {
  createPaymentController,
  getPaymentController,
  updatePaymentController,
  deletePaymentController,
  getAllPaymentsController,
  verifyPaymentController,
} = require("./payment.controller");

//authenticated routes go below here
// paymentRoute.use(isAuthenticated);

paymentRoute.post("/", createPaymentController);
paymentRoute.get("/", getAllPaymentsController);
paymentRoute.get("/", getPaymentController);
paymentRoute.put("/:id", updatePaymentController);
paymentRoute.delete("/:id", deletePaymentController);
paymentRoute.get("/verify/:reference", verifyPaymentController);

module.exports = paymentRoute;
