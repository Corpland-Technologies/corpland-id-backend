class CustomError extends Error {
  statusCode
  errors
  code

  constructor(message, statusCode = 400, errors, code) {
    super(message)
    this.statusCode = statusCode
    this.errors = errors
    this.code = code
  }
}

class DuplicateError extends Error {
  statusCode
  errors
  code

  constructor(message, statusCode = 409, errors, code) {
    super(message)
    this.statusCode = statusCode
    this.errors = errors
    this.code = code
  }
}

module.exports = { CustomError, DuplicateError }
