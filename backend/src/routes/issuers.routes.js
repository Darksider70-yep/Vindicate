import { Router } from "express";
import {
  approveRequest,
  getIssuers,
  rejectRequest,
  remove,
  requestApproval
} from "../controllers/issuers.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { ROLES } from "../constants/roles.js";
import { validate } from "../middlewares/validate.js";
import { issuerQuerySchema } from "../validators/credential.schemas.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  idParamSchema,
  issuerDecisionSchema,
  issuerRequestSchema
} from "../validators/governance.schemas.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize([ROLES.SUPER_ADMIN, ROLES.INSTITUTION_ADMIN, ROLES.VERIFIER]),
  validate(issuerQuerySchema, "query"),
  asyncHandler(getIssuers)
);

router.post(
  "/request",
  authenticate,
  validate(issuerRequestSchema),
  asyncHandler(requestApproval)
);

router.post(
  "/:id/approve",
  authenticate,
  authorize([ROLES.SUPER_ADMIN, ROLES.INSTITUTION_ADMIN]),
  validate(idParamSchema, "params"),
  validate(issuerDecisionSchema),
  asyncHandler(approveRequest)
);

router.post(
  "/:id/reject",
  authenticate,
  authorize([ROLES.SUPER_ADMIN, ROLES.INSTITUTION_ADMIN]),
  validate(idParamSchema, "params"),
  validate(issuerDecisionSchema),
  asyncHandler(rejectRequest)
);

router.post(
  "/:id/remove",
  authenticate,
  authorize([ROLES.SUPER_ADMIN, ROLES.INSTITUTION_ADMIN]),
  validate(idParamSchema, "params"),
  validate(issuerDecisionSchema),
  asyncHandler(remove)
);

export default router;
