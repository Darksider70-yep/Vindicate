import { Router } from "express";
import authRoutes from "./auth.routes.js";
import credentialsRoutes from "./credentials.routes.js";
import studentsRoutes from "./students.routes.js";
import issuersRoutes from "./issuers.routes.js";
import institutionsRoutes from "./institutions.routes.js";
import governanceRoutes from "./governance.routes.js";
import healthRoutes from "./health.routes.js";
import didRoutes from "./did.routes.js";
import vcRoutes from "./vc.routes.js";
import zkRoutes from "./zk.routes.js";
import apiGovernanceAdminRoutes from "./admin/api-governance.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/credentials", credentialsRoutes);
router.use("/students", studentsRoutes);
router.use("/issuers", issuersRoutes);
router.use("/institutions", institutionsRoutes);
router.use("/governance", governanceRoutes);
router.use("/did", didRoutes);
router.use("/vc", vcRoutes);
router.use("/zk", zkRoutes);
router.use("/admin/api-governance", apiGovernanceAdminRoutes);
router.use("/health", healthRoutes);

export default router;
