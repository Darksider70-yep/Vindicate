import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const baseLimiterConfig = {
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false
};

export const nonceRateLimiter = rateLimit({
  ...baseLimiterConfig,
  keyGenerator: (req) => req.body?.address?.toLowerCase?.() ?? req.ip,
  message: {
    error: {
      code: "AUTH_NONCE_RATE_LIMITED",
      message: "Too many nonce requests"
    }
  }
});

export const verifyRateLimiter = rateLimit({
  ...baseLimiterConfig,
  keyGenerator: (req) => req.ip,
  message: {
    error: {
      code: "AUTH_VERIFY_RATE_LIMITED",
      message: "Too many login attempts"
    }
  }
});
