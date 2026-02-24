import { sloMonitorService } from "../../services/security/slo-monitor.service.js";

export function sloTrackingMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    sloMonitorService.recordRequest({
      method: req.method,
      route: req.originalUrl,
      durationMs,
      statusCode: res.statusCode
    }).catch(() => {
      // SLO tracking is asynchronous and should not block responses.
    });
  });

  return next();
}