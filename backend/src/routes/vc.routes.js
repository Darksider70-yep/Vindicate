import { Router } from "express";
import {
  createDisclosureProof,
  createOfflineToken,
  getByHash,
  issue,
  revoke,
  verify,
  verifyDisclosureProof,
  verifyOfflineToken
} from "../controllers/vc.controller.js";
import { ISSUANCE_ROLES, ROLES } from "../constants/roles.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  issueVcSchema,
  offlineTokenCreateSchema,
  offlineTokenVerifySchema,
  selectiveDisclosureIssueSchema,
  selectiveDisclosureVerifySchema,
  vcHashParamSchema,
  vcIdParamSchema,
  verifyVcQuerySchema
} from "../validators/vc.schemas.js";

const router = Router();

router.post(
  "/issue",
  authenticate,
  authorize(ISSUANCE_ROLES),
  validate(issueVcSchema),
  asyncHandler(issue)
);

router.post(
  "/:id/disclosure-proof",
  authenticate,
  validate(vcIdParamSchema, "params"),
  validate(selectiveDisclosureIssueSchema),
  asyncHandler(createDisclosureProof)
);

router.post(
  "/disclosure/verify",
  validate(selectiveDisclosureVerifySchema),
  asyncHandler(verifyDisclosureProof)
);

router.post(
  "/:id/offline-token",
  authenticate,
  validate(vcIdParamSchema, "params"),
  validate(offlineTokenCreateSchema),
  asyncHandler(createOfflineToken)
);

router.post(
  "/offline/verify",
  validate(offlineTokenVerifySchema),
  asyncHandler(verifyOfflineToken)
);

router.get(
  "/:hash",
  authenticate,
  authorize([
    ROLES.SUPER_ADMIN,
    ROLES.INSTITUTION_ADMIN,
    ROLES.VERIFIED_ISSUER,
    ROLES.STUDENT,
    ROLES.VERIFIER
  ]),
  validate(vcHashParamSchema, "params"),
  asyncHandler(getByHash)
);

router.get(
  "/:hash/verify",
  validate(vcHashParamSchema, "params"),
  validate(verifyVcQuerySchema, "query"),
  asyncHandler(verify)
);

router.post(
  "/:hash/revoke",
  authenticate,
  authorize(ISSUANCE_ROLES),
  validate(vcHashParamSchema, "params"),
  asyncHandler(revoke)
);

export default router;
