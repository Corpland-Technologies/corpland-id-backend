const rateLimit = require("express-rate-limit");

const limitReached = (message) => (req, res) => {
  res.status(429).json({ message, code: "TOO_MANY_REQUESTS" });
};

const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: limitReached(
    "Too many attempts. Please wait a few minutes and try again.",
  ),
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: limitReached(
    "Too many codes requested. Please wait a few minutes before asking for another.",
  ),
});

module.exports = { credentialLimiter, otpLimiter };
