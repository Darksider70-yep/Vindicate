import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { requestContext } from "./middlewares/request-context.js";
import { metricsMiddleware } from "./middlewares/metrics.js";
import { notFound } from "./middlewares/not-found.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { apiVersionMiddleware } from "./middlewares/governance/api-version.js";
import { apiClientAuthMiddleware } from "./middlewares/governance/api-client-auth.js";
import { tierRateLimiter } from "./middlewares/governance/tier-rate-limit.js";
import { apiUsageTrackingMiddleware } from "./middlewares/governance/api-usage-tracking.js";
import { auditAccessMiddleware } from "./middlewares/governance/audit-access.js";
import { securityAnomalyMiddleware } from "./middlewares/governance/security-anomaly.js";
import { sloTrackingMiddleware } from "./middlewares/governance/slo-tracking.js";
import { AppError } from "./utils/app-error.js";
import routes from "./routes/index.js";

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (env.CORS_ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new AppError(403, "CORS_BLOCKED", "Origin not allowed by CORS policy"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id", env.CSRF_HEADER_NAME]
};

const httpLogger = pinoHttp({
  logger,
  customLogLevel(req, res, error) {
    if (error || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    if (req.url.includes("/health")) return "debug";
    return "info";
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  },
  customErrorMessage(req, res) {
    return `${req.method} ${req.url} failed with ${res.statusCode}`;
  }
});

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(requestContext);
  app.use(httpLogger);
  app.use(helmet());
  app.use(apiVersionMiddleware);
  app.use(cors(corsOptions));
  app.use(apiClientAuthMiddleware);
  app.use(tierRateLimiter);
  app.use(cookieParser());
  app.use(express.json({ limit: env.JSON_BODY_LIMIT }));
  app.use(metricsMiddleware);
  app.use(sloTrackingMiddleware);
  app.use(apiUsageTrackingMiddleware);
  app.use(securityAnomalyMiddleware);
  app.use(auditAccessMiddleware);

  app.use("/api/v1", routes);
  app.use("/api", routes);
  app.use(routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
