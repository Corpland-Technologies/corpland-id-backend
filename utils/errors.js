class CustomError extends Error {
    statusCode
    errors
  
    constructor(message, statusCode = 400, errors) {
      super(message)
      this.statusCode = statusCode
      this.errors = errors
    }
  }
  
  class DuplicateError extends Error {
    statusCode
    errors
  
    constructor(message, statusCode = 409, errors) {
      super(message)
      this.statusCode = statusCode
      this.errors = errors
    }
  }
  
  module.exports = { CustomError, DuplicateError }
  