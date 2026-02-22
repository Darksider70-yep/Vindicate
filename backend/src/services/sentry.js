import * as Sentry from "@sentry/node";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

let sentryEnabled = false;

export function initSentry() {
  if (!env.SENTRY_DSN) {
    logger.info("Sentry DSN not configured; error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: env.NODE_ENV
  });

  sentryEnabled = true;
  logger.info("Sentry initialized");
}

export function captureException(error, context = {}) {
  if (!sentryEnabled) return;
  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(context)) {
      scope.setExtra(key, value);
    }
    Sentry.captureException(error);
  });
}
