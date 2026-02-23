import { Router } from "express";
import {
  createChallenge,
  getChallenge,
  verifyProof
} from "../controllers/zk.controller.js";
import { ROLES } from "../constants/roles.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createZkChallengeSchema,
  verifyZkProofSchema,
  zkChallengeParamSchema
} from "../validators/zk.schemas.js";

const router = Router();

router.post(
  "/challenges",
  authenticate,
  authorize([ROLES.SUPER_ADMIN, ROLES.INSTITUTION_ADMIN, ROLES.VERIFIED_ISSUER, ROLES.VERIFIER]),
  validate(createZkChallengeSchema),
  asyncHandler(createChallenge)
);

router.post(
  "/verify",
  authenticate,
  validate(verifyZkProofSchema),
  asyncHandler(verifyProof)
);

router.get(
  "/challenges/:id",
  authenticate,
  validate(zkChallengeParamSchema, "params"),
  asyncHandler(getChallenge)
);

export default router;
