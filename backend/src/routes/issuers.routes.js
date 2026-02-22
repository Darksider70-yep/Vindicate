import { Router } from "express";
import { getIssuers } from "../controllers/issuers.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { ROLES } from "../constants/roles.js";
import { validate } from "../middlewares/validate.js";
import { issuerQuerySchema } from "../validators/credential.schemas.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize([ROLES.ADMIN, ROLES.INSTITUTION_ADMIN, ROLES.VERIFIER]),
  validate(issuerQuerySchema, "query"),
  asyncHandler(getIssuers)
);

export default router;
