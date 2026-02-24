import { Router } from "express";
import { ROLES } from "../../constants/roles.js";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { getApiUsage, rotateApiKey } from "../../controllers/admin/api-governance.controller.js";
import {
  clientIdParamSchema,
  rotateApiKeySchema,
  usageQuerySchema
} from "../../validators/api-governance.schemas.js";

const router = Router();

router.get(
  "/clients/usage",
  authenticate,
  authorize([ROLES.SUPER_ADMIN]),
  validate(usageQuerySchema, "query"),
  asyncHandler(getApiUsage)
);

router.post(
  "/clients/:clientId/keys/rotate",
  authenticate,
  authorize([ROLES.SUPER_ADMIN]),
  validate(clientIdParamSchema, "params"),
  validate(rotateApiKeySchema),
  asyncHandler(rotateApiKey)
);

export default router;