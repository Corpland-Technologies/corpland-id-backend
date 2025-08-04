const userRoute = require("express").Router();
const { isAuthenticated } = require("../../utils/index");
const { uploadManager } = require("../../utils/multer");
const {
  updateUserController,
  changeUserPasswordController,
  imageUpload,
  getUserController,
  getLoggedInUserController,
  deleteUserController,
  userSignUpController,
  userLogin,
  searchUserController,
  verifyEmailController,
  forgotPasswordController,
  verifyResetCodeController,
  resetPasswordController,
  getAllUsersController,
  requestAccountDeletionController,
  getUserByIdController,
  sendSingleEmailNotificationController,
  sendBulkEmailNotificationController,
} = require("./user.controller");

const { checkSchema } = require("express-validator");
const { createUser } = require("../../validations/user/user");
const { validate } = require("../../validations/validate");

userRoute
  .route("/")
  .post(validate(checkSchema(createUser)), userSignUpController);
userRoute.post("/login", userLogin);
userRoute.post("/verify-email", verifyEmailController);
userRoute.post("/forgot-password", forgotPasswordController);
userRoute.post("/verify-reset-code", verifyResetCodeController);
userRoute.post("/reset-password", resetPasswordController);
userRoute.post("/email", sendBulkEmailNotificationController);
userRoute.post("/email/:id", sendSingleEmailNotificationController);
userRoute.get("/all", getAllUsersController);
userRoute.put("/update/:id", updateUserController);

userRoute.use(isAuthenticated);

// Routes
userRoute.get("/search", searchUserController);
userRoute.put("/password", changeUserPasswordController);
userRoute.get("/me", getLoggedInUserController);
userRoute.get("/", getUserController);
userRoute.put("/delete/:id", deleteUserController);
userRoute.put("/image", uploadManager("image").single("image"), imageUpload);
userRoute.delete("/request-deletion", requestAccountDeletionController);

module.exports = userRoute;
