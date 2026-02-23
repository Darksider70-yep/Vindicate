import { Router } from "express";
import {
  registerInstitution,
  registerStudent,
  resolve,
  verifyOwnership
} from "../controllers/did.controller.js";
import { ROLES } from "../constants/roles.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  registerInstitutionDidSchema,
  registerStudentDidSchema,
  resolveDidQuerySchema,
  verifyDidOwnershipSchema
} from "../validators/did.schemas.js";

const router = Router();

router.post(
  "/register/student",
  authenticate,
  validate(registerStudentDidSchema),
  asyncHandler(registerStudent)
);

router.post(
  "/register/institution",
  authenticate,
  authorize([ROLES.SUPER_ADMIN, ROLES.INSTITUTION_ADMIN]),
  validate(registerInstitutionDidSchema),
  asyncHandler(registerInstitution)
);

router.get(
  "/resolve",
  validate(resolveDidQuerySchema, "query"),
  asyncHandler(resolve)
);

router.post(
  "/verify",
  validate(verifyDidOwnershipSchema),
  asyncHandler(verifyOwnership)
);

export default router;
