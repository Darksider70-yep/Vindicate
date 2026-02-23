import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";

function computeExpiryFromDecoded(decodedToken) {
  if (!decodedToken || typeof decodedToken !== "object" || !decodedToken.exp) {
    throw new AppError(500, "TOKEN_SIGN_ERROR", "Token missing expiration");
  }
  return new Date(Number(decodedToken.exp) * 1000);
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateCsrfToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function signAccessToken({ sub, walletAddress, role, institutionId, sessionId }) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      sub,
      walletAddress,
      role,
      institutionId: institutionId ?? null,
      sessionId,
      tokenType: "access"
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      jwtid: jti
    }
  );

  const decoded = jwt.decode(token);
  return {
    token,
    jti,
    expiresAt: computeExpiryFromDecoded(decoded)
  };
}

export function signRefreshToken({ sub, sessionId }) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      sub,
      sessionId,
      tokenType: "refresh"
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      jwtid: jti
    }
  );

  const decoded = jwt.decode(token);
  return {
    token,
    tokenId: jti,
    expiresAt: computeExpiryFromDecoded(decoded)
  };
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (payload.tokenType !== "access") {
    throw new AppError(401, "AUTH_INVALID", "Invalid access token type");
  }
  return payload;
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
  if (payload.tokenType !== "refresh") {
    throw new AppError(401, "AUTH_INVALID", "Invalid refresh token type");
  }
  return payload;
}
