const { Admin } = require("../../files/admin/admin.model")

const createAdmin = {
  name: {
    notEmpty: true,
    errorMessage: "Full name cannot be empty",
  },
  email: {
    notEmpty: true,
    errorMessage: "Email cannot be empty",
    isEmail: {
      errorMessage: "Invalid email address",
    },
    custom: {
      options: (v) => {
        return Admin.find({
          email: v,
        }).then((admin) => {
          if (admin.length > 0) {
            return Promise.reject("Email already in use")
          }
        })
      },
    },
  },
  password: {
    notEmpty: true,
    errorMessage: "Password cannot be empty",
  },
 
}

module.exports = { createAdmin }
