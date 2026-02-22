import { verifyToken } from "../services/auth/token.service.js";
import { AppError } from "../utils/app-error.js";

export function authenticate(req, _res, next) {
  const authHeader = req.header("authorization");
  if (!authHeader) {
    return next(new AppError(401, "AUTH_REQUIRED", "Missing authorization header"));
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return next(new AppError(401, "AUTH_INVALID", "Authorization header must be Bearer token"));
  }

  try {
    req.auth = verifyToken(token);
    return next();
  } catch (error) {
    return next(new AppError(401, "AUTH_INVALID", "Invalid or expired token", undefined, error));
  }
}

export function authorize(allowedRoles) {
  return (req, _res, next) => {
    if (!req.auth?.role) {
      return next(new AppError(401, "AUTH_REQUIRED", "Authentication required"));
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return next(new AppError(403, "FORBIDDEN", "Insufficient permissions"));
    }

    return next();
  };
}
