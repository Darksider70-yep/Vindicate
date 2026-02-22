import { Router } from "express";
import { getByHash, issue, revoke } from "../controllers/credentials.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { ISSUANCE_ROLES, ROLES } from "../constants/roles.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  credentialHashParamSchema,
  issueCredentialSchema,
  revokeCredentialSchema
} from "../validators/credential.schemas.js";

const router = Router();

router.post(
  "/issue",
  authenticate,
  authorize(ISSUANCE_ROLES),
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

router.get("/:hash", validate(credentialHashParamSchema, "params"), asyncHandler(getByHash));

router.get("/", authenticate, authorize([ROLES.ADMIN]), async (_req, res) => {
  res.status(405).json({
    error: {
      code: "METHOD_NOT_ALLOWED",
      message: "Use GET /credentials/:hash"
    }
  });
});

export default router;
