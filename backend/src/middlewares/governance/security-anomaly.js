import { anomalyMonitorService } from "../../services/security/anomaly-monitor.service.js";

function extractCredentialHash(pathname) {
  const match = pathname.match(/\/credentials\/([0-9a-fA-Fx]{10,})$/);
  return match ? match[1].toLowerCase() : null;
}

export function securityAnomalyMiddleware(req, res, next) {
  res.on("finish", () => {
    if (res.statusCode >= 500) {
      return;
    }

    const route = req.originalUrl;

    if (req.method === "GET" && route.includes("/credentials/") && !route.endsWith("/qr")) {
      anomalyMonitorService.recordVerification({
        credentialHash: extractCredentialHash(route),
        sourceIp: req.ip,
        apiClientId: req.apiClient?.clientId ?? null
      }).catch(() => {
        // Anomaly checks are asynchronous and non-blocking.
      });
      return;
    }

    if (req.method === "POST" && route.endsWith("/credentials/issue")) {
      anomalyMonitorService.recordIssuance({
        issuerId: req.auth?.sub ?? null,
        institutionId: req.body?.institutionId ?? null
      }).catch(() => {
        // Anomaly checks are asynchronous and non-blocking.
      });
    }
  });

  return next();
}