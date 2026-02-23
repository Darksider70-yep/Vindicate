import crypto from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

function safeEqual(a, b) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  if (first.length !== second.length) {
    return false;
  }
  return crypto.timingSafeEqual(first, second);
}

export function requireCsrf(req, _res, next) {
  if (!env.AUTH_COOKIE_ENABLED) {
    return next();
  }

  const csrfCookie = req.cookies?.[env.AUTH_COOKIE_NAME_CSRF];
  const csrfHeader = req.header(env.CSRF_HEADER_NAME);

  if (!csrfCookie || !csrfHeader) {
    return next(new AppError(403, "CSRF_MISSING", "Missing CSRF token"));
  }

  if (!safeEqual(csrfCookie, csrfHeader)) {
    return next(new AppError(403, "CSRF_INVALID", "Invalid CSRF token"));
  }

  return next();
}
