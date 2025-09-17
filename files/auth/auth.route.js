const {
  sendOtpController,
  verifyOtpController,
  resetPasswordController,
  resetAdminPasswordController,
  logoutController,
  merchantResetPasswordController,
  customerResetPasswordController,
  enterpriseResetPasswordController,
} = require("./controller/sendOtp.controller");

const authRoute = require("express").Router();

//routes
authRoute.post("/otp", sendOtpController);
authRoute.post("/reset-password", resetPasswordController);
authRoute.post("/enterprise-reset-password", enterpriseResetPasswordController);
authRoute.post("/merchant-reset-password", merchantResetPasswordController);
authRoute.post("/customer-reset-password", customerResetPasswordController);
authRoute.post("/reset-admin-password", resetAdminPasswordController);
authRoute.post("/otp/verify", verifyOtpController);

authRoute.post("/logout", logoutController);

module.exports = authRoute;
