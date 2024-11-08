const adminRoute = require("express").Router();
const { isAuthenticated } = require("../../utils/index");
const { uploadManager } = require("../../utils/multer");
const {
  updateAdminController,
  changeAdminPasswordController,
  imageUpload,
  getAdminController,
  getLoggedInAdminController,
  deleteAdminController,
  adminSignUpController,
  adminLogin,
  searchAdminController,
} = require("./admin.controller");

const { checkSchema } = require("express-validator");
const { createAdmin } = require("../../validations/admin/admin");
const { validate } = require("../../validations/validate");

adminRoute.route("/").post(validate(checkSchema(createAdmin)), adminSignUpController);
adminRoute.post("/login", adminLogin);

adminRoute.use(isAuthenticated);

// Routes
adminRoute.get("/search", searchAdminController);
adminRoute.put("/update/:id", updateAdminController);
adminRoute.put("/password", changeAdminPasswordController);
adminRoute.get("/", getAdminController);
adminRoute.get("/me", getLoggedInAdminController);
adminRoute.put("/delete/:id", deleteAdminController);
adminRoute.put("/image", uploadManager("image").single("image"), imageUpload);

module.exports = adminRoute;
