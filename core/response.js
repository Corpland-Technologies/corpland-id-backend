const { CustomError, DuplicateError } = require("../utils/errors")
const { generalMessages } = require("./generalMessages")

const buildErrorPayload = (err) => {
  const { errors = {}, message, code } = err
  const payload = { message }

  if (code) payload.code = code
  if (errors && Object.keys(errors).length > 0) payload.errors = errors

  return payload
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
module.exports.handleApplicationErrors = (err, req, res, _next) => {
  if (err instanceof CustomError || err instanceof DuplicateError) {
    return res.status(err.statusCode).json(buildErrorPayload(err))
  }

  res.status(400).json({ message: err.message })
}

module.exports.notFound = (req, res) => {
  res.status(400).json({ message: generalMessages.ROUTE_NOT_FOUND })
}

module.exports.responseHandler = (res, statusCode = 200, data) => {
  res.status(statusCode).json(data)
}
