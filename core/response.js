const { CustomError, DuplicateError } = require("../utils/errors")
const { generalMessages } = require("./generalMessages")

// eslint-disable-next-line @typescript-eslint/no-unused-vars
module.exports.handleApplicationErrors = (err, req, res, _next) => {
  if (err instanceof CustomError) {
    const { errors = {}, message, statusCode } = err
    const payload =
      Object.keys(errors)?.length > 0 ? { message, errors } : { message }
    return res.status(statusCode).json(payload)
  } else if (err instanceof DuplicateError) {
    const { errors = {}, message, statusCode } = err
    const payload =
      Object.keys(errors)?.length > 0 ? { message, errors } : { message }
    return res.status(statusCode).json(payload)
  }

  res.status(400).json({ message: generalMessages.UNEXPECTED_FAILURE })
  // res.status(400).json({ message: err.message})

}

module.exports.notFound = (req, res) => {
  res.status(400).json({ message: generalMessages.ROUTE_NOT_FOUND })
}

module.exports.responseHandler = (res, statusCode = 200, data) => {
  res.status(statusCode).json(data)
}
