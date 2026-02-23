import { Router } from "express";
import {
  approveRotation,
  assignRole,
  listRotations,
  rejectRotation,
  requestRotation
} from "../controllers/governance.controller.js";
import { ROLES } from "../constants/roles.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  assignRoleSchema,
  idParamSchema,
  walletRotationDecisionSchema,
  walletRotationQuerySchema,
  walletRotationRequestSchema
} from "../validators/governance.schemas.js";

const router = Router();

router.post(
  "/roles/assign",
  authenticate,
  authorize([ROLES.SUPER_ADMIN]),
  validate(assignRoleSchema),
  asyncHandler(assignRole)
);

router.get(
  "/wallet-rotation",
  authenticate,
  authorize([ROLES.SUPER_ADMIN]),
  validate(walletRotationQuerySchema, "query"),
  asyncHandler(listRotations)
);

router.post(
  "/wallet-rotation/request",
  authenticate,
  validate(walletRotationRequestSchema),
  asyncHandler(requestRotation)
);

router.post(
  "/wallet-rotation/:id/approve",
  authenticate,
  authorize([ROLES.SUPER_ADMIN]),
  validate(idParamSchema, "params"),
  validate(walletRotationDecisionSchema),
  asyncHandler(approveRotation)
);

router.post(
  "/wallet-rotation/:id/reject",
  authenticate,
  authorize([ROLES.SUPER_ADMIN]),
  validate(idParamSchema, "params"),
  validate(walletRotationDecisionSchema.partial({ proofMessage: true, proofSignature: true })),
  asyncHandler(rejectRotation)
);

export default router;
