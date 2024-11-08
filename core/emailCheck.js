const emailValidation = (req, res, next) => {
    let array = Object.keys(req.body)
    if (array.length !== 0) {
      const mod = new Promise((resolve, reject) => {
        for (let i = 0; i < array.length; i++) {
          if (array[i].includes("Email") || array[i].includes("email")) {
            req.body[`${array[i]}`] = req.body[`${array[i]}`].toLowerCase().trim()
          }
          if (array.length - 1 === i) {
            resolve()
          }
        }
      })
  
      Promise.all([mod]).then((res) => next())
    } else {
      return next()
    }
  }
  
  module.exports = emailValidation
  