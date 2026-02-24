import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";
import { apiGovernanceService } from "../../services/compliance/api-governance.service.js";

export const tierRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: (req) => {
    if (req.apiClient?.tier) {
      return apiGovernanceService.getTierLimit(req.apiClient.tier);
    }
    return env.RATE_LIMIT_MAX;
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.apiClient?.clientId ?? req.auth?.sub ?? req.ip,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests for assigned rate tier"
    }
  }
});