const crypto = require("crypto");
const { config } = require("../core/config");

const matches = (provided, expected) => {
  if (!provided || !expected) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const requireInternalKey = (req, res, next) => {
  if (matches(req.headers["x-internal-key"], config.INTERNAL_API_KEY)) {
    return next();
  }

  return res.status(401).json({ message: "Unauthorized." });
};

module.exports = { requireInternalKey };
