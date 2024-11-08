const { validationResult } = require("express-validator")

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)))
    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }
    res.status(400).json({ success: false, errors: errors.array() })
  }
}

const verifyEmail = {
  otp: {
      notEmpty: true,
      errorMessage: "OTP cannot be empty",
  },
}

module.exports = { validate, verifyEmail}
