import { Router } from "express";
import { getStudentByAddress } from "../controllers/students.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { ROLES } from "../constants/roles.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { studentAddressParamSchema } from "../validators/credential.schemas.js";

const router = Router();

router.get(
  "/:address",
  authenticate,
  authorize([
    ROLES.SUPER_ADMIN,
    ROLES.INSTITUTION_ADMIN,
    ROLES.VERIFIED_ISSUER,
    ROLES.VERIFIER,
    ROLES.STUDENT
  ]),
  validate(studentAddressParamSchema, "params"),
  asyncHandler(getStudentByAddress)
);

export default router;
