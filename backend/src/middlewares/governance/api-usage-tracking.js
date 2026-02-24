import { apiGovernanceService } from "../../services/compliance/api-governance.service.js";

export function apiUsageTrackingMiddleware(req, res, next) {
  res.on("finish", () => {
    apiGovernanceService.recordUsage({
      clientId: req.apiClient?.clientId ?? null,
      tier: req.apiClient?.tier ?? null,
      route: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode
    }).catch(() => {
      // Usage tracking is best-effort.
    });
  });

  return next();
}