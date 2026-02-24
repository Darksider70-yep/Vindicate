import client from "prom-client";
import { env } from "../config/env.js";

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const requestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code"]
});

const requestDurationHistogram = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

registry.registerMetric(requestCounter);
registry.registerMetric(requestDurationHistogram);

export function metricsMiddleware(req, res, next) {
  if (!env.ENABLE_METRICS) {
    return next();
  }

  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationSeconds = Number(end - start) / 1_000_000_000;
    const route = req.route?.path ?? req.path;
    const statusCode = String(res.statusCode);

    requestCounter.inc({ method: req.method, route, status_code: statusCode });
    requestDurationHistogram.observe(
      { method: req.method, route, status_code: statusCode },
      durationSeconds
    );
  });

  return next();
}

export async function metricsHandler(_req, res) {
  res.setHeader("Content-Type", registry.contentType);
  res.send(await registry.metrics());
}
