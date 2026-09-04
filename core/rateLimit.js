const WINDOW_MS = 15 * 60 * 1000;
const SWEEP_MS = 5 * 60 * 1000;

const buckets = new Map();

const sweep = () => {
  const now = Date.now();

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
};

const sweeper = setInterval(sweep, SWEEP_MS);

if (typeof sweeper.unref === "function") sweeper.unref();

const clientKey = (req) =>
  req.ip ||
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.connection?.remoteAddress ||
  "unknown";

const createRateLimiter = ({ name, limit, windowMs = WINDOW_MS, message }) => {
  return (req, res, next) => {
    const key = `${name}:${clientKey(req)}`;
    const now = Date.now();

    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, limit - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader("RateLimit-Limit", limit);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", resetSeconds);

    if (bucket.count > limit) {
      res.setHeader("Retry-After", resetSeconds);
      return res.status(429).json({ message, code: "TOO_MANY_REQUESTS" });
    }

    return next();
  };
};

const credentialLimiter = createRateLimiter({
  name: "credential",
  limit: 20,
  message: "Too many attempts. Please wait a few minutes and try again.",
});

const otpLimiter = createRateLimiter({
  name: "otp",
  limit: 5,
  message:
    "Too many codes requested. Please wait a few minutes before asking for another.",
});

module.exports = { createRateLimiter, credentialLimiter, otpLimiter };
