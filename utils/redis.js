const url = require("url");
const Redis = require("ioredis");
const { config } = require("../core/config");

let redis_uri = url.parse(config.REDIS_URL);

let redis;

const RESILIENCE_OPTIONS = {
  enableOfflineQueue: false,
  connectTimeout: 5000,
  commandTimeout: 5000,
  maxRetriesPerRequest: 1,
};

if (config.ENV === "HEROKU_PROD") {
  redis = new Redis({
    port: Number(redis_uri.port) + 1,
    host: redis_uri.hostname,
    password: redis_uri.auth.split(":")[1],
    db: 0,
    tls: {
      rejectUnauthorized: false,
      requestCert: true,
      agent: false,
    },
    ...RESILIENCE_OPTIONS,
  });
} else {
  redis = new Redis(config.REDIS_URL, RESILIENCE_OPTIONS);
}

class RedisClient {
  static async setCache(payload) {
    const { key, value, expiry = 60 * 30 } = payload;
    return redis.set(key, JSON.stringify(value), "EX", expiry); //expires in 30 minutes
  }

  static async getCache(key) {
    return redis.get(key);
  }

  static async deleteCache(key) {
    return redis.del(key);
  }
}

module.exports = { redis, RedisClient };
