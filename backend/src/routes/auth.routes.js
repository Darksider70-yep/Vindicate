import { Router } from "express";
import {
  issueNonce,
  logout,
  me,
  refresh,
  verifySignature
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { nonceRateLimiter, verifyRateLimiter } from "../middlewares/auth-rate-limit.js";
import { requireCsrf } from "../middlewares/csrf.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  logoutSchema,
  nonceRequestSchema,
  refreshTokenSchema,
  verifySiweSchema
} from "../validators/auth.schemas.js";

const router = Router();

router.post(
  "/nonce",
  nonceRateLimiter,
  validate(nonceRequestSchema),
  asyncHandler(issueNonce)
);

router.post(
  "/verify",
  verifyRateLimiter,
  validate(verifySiweSchema),
  asyncHandler(verifySignature)
);

router.post(
  "/login",
  verifyRateLimiter,
  validate(verifySiweSchema),
  asyncHandler(verifySignature)
);

router.post(
  "/refresh",
  verifyRateLimiter,
  requireCsrf,
  validate(refreshTokenSchema),
  asyncHandler(refresh)
);

router.post(
  "/logout",
  authenticate,
  requireCsrf,
  validate(logoutSchema),
  asyncHandler(logout)
);

router.get("/me", authenticate, asyncHandler(me));

export default router;
