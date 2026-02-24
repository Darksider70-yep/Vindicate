import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { auditLogService } from "../compliance/audit-log.service.js";

async function postJson(url, payload) {
  if (!url) {
    return { delivered: false };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed with status ${response.status}`);
  }

  return { delivered: true };
}

class AlertDispatcherService {
  async dispatch(alert) {
    const payload = {
      schemaVersion: "alert.v1",
      timestamp: new Date().toISOString(),
      service: "vindicate-backend",
      environment: env.NODE_ENV,
      severity: alert.severity,
      category: alert.category,
      title: alert.title,
      description: alert.description,
      dedupeKey: alert.dedupeKey,
      metadata: alert.metadata ?? {}
    };

    logger.warn(
      {
        eventType: "security_alert",
        format: "siem_v1",
        ...payload
      },
      payload.title
    );

    const deliveries = await Promise.allSettled([
      postJson(env.ALERT_WEBHOOK_URL, payload),
      postJson(env.SLACK_WEBHOOK_URL, {
        text: `[${payload.severity}] ${payload.title}`,
        metadata: payload
      }),
      postJson(env.EMAIL_ALERT_WEBHOOK_URL, payload)
    ]);

    await auditLogService.record({
      eventType: "security_alert",
      outcome: deliveries.some((result) => result.status === "fulfilled") ? "DELIVERED" : "FAILED",
      action: payload.title,
      resourceType: "alert",
      resourceId: alert.dedupeKey ?? payload.title,
      metadata: {
        ...payload,
        deliveries: deliveries.map((result) =>
          result.status === "fulfilled"
            ? { status: "ok" }
            : { status: "error", message: result.reason?.message ?? "unknown" }
        )
      }
    });
  }
}

export const alertDispatcherService = new AlertDispatcherService();