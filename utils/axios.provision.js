const axios = require("axios")

class RequestHandler {
  static requestHandler
  static setup(config) {
    this.requestHandler = axios.create(config)
    return this.requestHandler
  }
}

module.exports = RequestHandler
