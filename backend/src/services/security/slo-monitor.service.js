import client from "prom-client";
import { env } from "../../config/env.js";
import { alertDispatcherService } from "./alert-dispatcher.service.js";
import { registry } from "../../middlewares/metrics.js";

function getCounter(name, help, labelNames) {
  const existing = registry.getSingleMetric(name);
  if (existing) {
    return existing;
  }

  const counter = new client.Counter({
    name,
    help,
    labelNames
  });
  registry.registerMetric(counter);
  return counter;
}

class SloMonitorService {
  constructor() {
    this.verificationBreachCounter = getCounter(
      "vindicate_slo_verification_latency_breaches_total",
      "Verification requests breaching configured SLO latency",
      ["route"]
    );
    this.issuanceBreachCounter = getCounter(
      "vindicate_slo_issuance_latency_breaches_total",
      "Issuance requests breaching configured SLO latency",
      ["route"]
    );

    this.lastAlertAt = new Map();
  }

  async recordRequest({ method, route, durationMs, statusCode }) {
    const normalizedRoute = route ?? "unknown";

    if (method === "GET" && normalizedRoute.includes("/credentials/") && !normalizedRoute.endsWith("/qr")) {
      if (durationMs > env.SLO_VERIFICATION_LATENCY_MS) {
        this.verificationBreachCounter.inc({ route: normalizedRoute });
        await this._alertOnce(
          "verification-slo-breach",
          "medium",
          "Verification latency SLO breached",
          {
            route: normalizedRoute,
            durationMs,
            thresholdMs: env.SLO_VERIFICATION_LATENCY_MS,
            statusCode
          }
        );
      }
      return;
    }

    if (method === "POST" && normalizedRoute.endsWith("/credentials/issue")) {
      if (durationMs > env.SLO_ISSUANCE_LATENCY_MS) {
        this.issuanceBreachCounter.inc({ route: normalizedRoute });
        await this._alertOnce(
          "issuance-slo-breach",
          "high",
          "Issuance transaction SLO breached",
          {
            route: normalizedRoute,
            durationMs,
            thresholdMs: env.SLO_ISSUANCE_LATENCY_MS,
            statusCode
          }
        );
      }
    }
  }

  async _alertOnce(key, severity, title, metadata) {
    const cooldownMs = env.SLO_ALERT_COOLDOWN_SECONDS * 1000;
    const last = this.lastAlertAt.get(key) ?? 0;
    if (Date.now() - last < cooldownMs) {
      return;
    }

    this.lastAlertAt.set(key, Date.now());

    await alertDispatcherService.dispatch({
      severity,
      category: "slo",
      title,
      description: "Observed request latency exceeded configured SLO threshold",
      dedupeKey: key,
      metadata
    });
  }
}

export const sloMonitorService = new SloMonitorService();