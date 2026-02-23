import { prisma } from "../db/prisma.js";
import { verifyAccessToken } from "../services/auth/token.service.js";
import { AppError } from "../utils/app-error.js";

function extractBearerToken(req) {
  const authHeader = req.header("authorization");
  if (!authHeader) {
    throw new AppError(401, "AUTH_REQUIRED", "Missing authorization header");
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new AppError(401, "AUTH_INVALID", "Authorization header must be Bearer token");
  }

  return token;
}

export async function authenticate(req, _res, next) {
  try {
    const token = extractBearerToken(req);
    const payload = verifyAccessToken(token);

    if (!payload.jti || !payload.sessionId || !payload.sub) {
      throw new AppError(401, "AUTH_INVALID", "Invalid access token payload");
    }

    const [blockedToken, session] = await Promise.all([
      prisma.tokenBlocklist.findUnique({
        where: { jti: payload.jti }
      }),
      prisma.authSession.findUnique({
        where: { id: payload.sessionId }
      })
    ]);

    if (blockedToken) {
      throw new AppError(401, "AUTH_REVOKED", "Token has been revoked");
    }

    if (!session || session.userId !== payload.sub) {
      throw new AppError(401, "AUTH_INVALID", "Session not found");
    }

    if (session.revokedAt) {
      throw new AppError(401, "AUTH_REVOKED", "Session has been revoked");
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new AppError(401, "AUTH_EXPIRED", "Session expired");
    }

    req.auth = payload;
    return next();
  } catch (error) {
    return next(error);
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
