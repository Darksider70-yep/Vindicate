import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  blacklistHash,
  emergencyRevoke,
  getByHash,
  getQr,
  issue,
  revoke
} from "../controllers/credentials.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { ISSUANCE_ROLES, ROLES } from "../constants/roles.js";
import { asyncHandler } from "../utils/async-handler.js";
import { env } from "../config/env.js";
import {
  blacklistHashSchema,
  credentialHashParamSchema,
  issueCredentialSchema,
  revokeCredentialSchema
} from "../validators/credential.schemas.js";

const router = Router();

const uploadRateLimiter = rateLimit({
  windowMs: env.UPLOAD_RATE_LIMIT_WINDOW_MS,
  max: env.UPLOAD_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.sub ?? req.ip,
  message: {
    error: {
      code: "UPLOAD_RATE_LIMITED",
      message: "Too many issuance attempts"
    }
  }
});

const verificationRateLimiter = rateLimit({
  windowMs: env.VERIFY_RATE_LIMIT_WINDOW_MS,
  max: env.VERIFY_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: {
    error: {
      code: "VERIFY_RATE_LIMITED",
      message: "Too many verification requests"
    }
  }
});

router.post(
  "/issue",
  authenticate,
  authorize(ISSUANCE_ROLES),
  uploadRateLimiter,
  validate(issueCredentialSchema),
  asyncHandler(issue)
);

router.post(
  "/revoke",
  authenticate,
  authorize(ISSUANCE_ROLES),
  validate(revokeCredentialSchema),
  asyncHandler(revoke)
);

router.post(
  "/emergency/revoke",
  authenticate,
  authorize([ROLES.SUPER_ADMIN]),
  validate(revokeCredentialSchema),
  asyncHandler(emergencyRevoke)
);

router.post(
  "/blacklist",
  authenticate,
  authorize([ROLES.SUPER_ADMIN]),
  validate(blacklistHashSchema),
  asyncHandler(blacklistHash)
);

router.get(
  "/:hash/qr",
  verificationRateLimiter,
  validate(credentialHashParamSchema, "params"),
  asyncHandler(getQr)
);

router.get(
  "/:hash",
  verificationRateLimiter,
  validate(credentialHashParamSchema, "params"),
  asyncHandler(getByHash)
);

export default router;
