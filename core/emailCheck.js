const emailValidation = (req, res, next) => {
  const body = req.body

  if (!body || typeof body !== "object") return next()

  for (const key of Object.keys(body)) {
    if (!key.toLowerCase().includes("email")) continue
    if (typeof body[key] !== "string") continue

    body[key] = body[key].toLowerCase().trim()
  }

  return next()
}

module.exports = emailValidation
