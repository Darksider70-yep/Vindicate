import { Router } from "express";
import { login } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { loginSchema } from "../validators/auth.schemas.js";

const router = Router();

router.post("/login", validate(loginSchema), asyncHandler(login));

export default router;
