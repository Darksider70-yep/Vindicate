import { Router } from "express";
import {
  approveOnboarding,
  list,
  rejectOnboarding,
  requestOnboarding
} from "../controllers/institutions.controller.js";
import { ROLES } from "../constants/roles.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  idParamSchema,
  institutionDecisionSchema,
  institutionQuerySchema,
  institutionRequestSchema
} from "../validators/governance.schemas.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize([ROLES.SUPER_ADMIN, ROLES.INSTITUTION_ADMIN, ROLES.VERIFIER]),
  validate(institutionQuerySchema, "query"),
  asyncHandler(list)
);

router.post(
  "/requests",
  authenticate,
  validate(institutionRequestSchema),
  asyncHandler(requestOnboarding)
);

router.post(
  "/:id/approve",
  authenticate,
  authorize([ROLES.SUPER_ADMIN]),
  validate(idParamSchema, "params"),
  validate(institutionDecisionSchema),
  asyncHandler(approveOnboarding)
);

router.post(
  "/:id/reject",
  authenticate,
  authorize([ROLES.SUPER_ADMIN]),
  validate(idParamSchema, "params"),
  validate(institutionDecisionSchema),
  asyncHandler(rejectOnboarding)
);

export default router;
