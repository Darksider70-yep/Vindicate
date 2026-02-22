import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { captureException } from "../services/sentry.js";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/app-error.js";

function toAppError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError(400, "VALIDATION_ERROR", "Request validation failed", error.flatten());
  }

  if (error instanceof TokenExpiredError) {
    return new AppError(401, "AUTH_TOKEN_EXPIRED", "Session expired");
  }

  if (error instanceof JsonWebTokenError) {
    return new AppError(401, "AUTH_INVALID", "Invalid authentication token");
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new AppError(409, "CONFLICT", "Unique constraint violation", error.meta);
    }
    if (error.code === "P2025") {
      return new AppError(404, "NOT_FOUND", "Requested resource does not exist");
    }
  }

  return new AppError(500, "INTERNAL_ERROR", "Unexpected server error", undefined, error);
}

export function errorHandler(error, req, res, _next) {
  const appError = toAppError(error);

  logger.error(
    {
      requestId: req.id,
      code: appError.code,
      details: appError.details,
      stack: appError.stack,
      cause: appError.cause
    },
    appError.message
  );

  if (appError.statusCode >= 500) {
    captureException(error, {
      requestId: req.id,
      code: appError.code
    });
  }

  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details
    },
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}
