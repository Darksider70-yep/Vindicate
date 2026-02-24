import { auditLogService } from "../../services/compliance/audit-log.service.js";

const ACCESS_AUDIT_EXCLUDED = ["/health", "/health/metrics"];

export function auditAccessMiddleware(req, res, next) {
  if (ACCESS_AUDIT_EXCLUDED.some((pathPrefix) => req.path.startsWith(pathPrefix))) {
    return next();
  }

  res.on("finish", () => {
    const outcome = res.statusCode >= 400 ? "DENY" : "ALLOW";
    auditLogService.recordAccess(req, res, outcome).catch(() => {
      // Access audits are best-effort and should not affect request lifecycle.
    });
  });

  return next();
}