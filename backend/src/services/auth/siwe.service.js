import { ethers } from "ethers";
import { SiweMessage, generateNonce } from "siwe";
import { env } from "../../config/env.js";
import { ROLES } from "../../constants/roles.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/app-error.js";
import {
  generateCsrfToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "./token.service.js";

function normalizeAddress(address) {
  if (!ethers.isAddress(address)) {
    throw new AppError(400, "INVALID_ADDRESS", "Invalid wallet address format");
  }
  return ethers.getAddress(address).toLowerCase();
}

function getSessionExpiry() {
  return new Date(Date.now() + env.AUTH_SESSION_TTL_SECONDS * 1000);
}

function ensureNonceUsable(nonceRecord, normalizedAddress) {
  if (!nonceRecord) {
    throw new AppError(401, "SIWE_NONCE_INVALID", "Nonce not found");
  }

  if (nonceRecord.walletAddress !== normalizedAddress) {
    throw new AppError(401, "SIWE_NONCE_MISMATCH", "Nonce does not match wallet");
  }

  if (nonceRecord.usedAt) {
    throw new AppError(401, "SIWE_NONCE_USED", "Nonce already used");
  }

  if (nonceRecord.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, "SIWE_NONCE_EXPIRED", "Nonce expired");
  }

  if (nonceRecord.attempts >= env.SIWE_MAX_VERIFICATION_ATTEMPTS) {
    throw new AppError(429, "SIWE_ATTEMPT_LIMIT", "Too many failed SIWE verification attempts");
  }
}

function assertSiweContext(parsedMessage) {
  if (parsedMessage.domain !== env.SIWE_DOMAIN) {
    throw new AppError(401, "SIWE_DOMAIN_INVALID", "SIWE domain mismatch");
  }

  if (parsedMessage.uri !== env.SIWE_URI) {
    throw new AppError(401, "SIWE_URI_INVALID", "SIWE URI mismatch");
  }

  if (Number(parsedMessage.chainId) !== env.CHAIN_ID) {
    throw new AppError(401, "SIWE_CHAIN_INVALID", "SIWE chainId mismatch");
  }
}

function toAuthResponse({ user, accessToken, refreshToken, csrfToken, accessExpiresAt, refreshExpiresAt }) {
  return {
    accessToken,
    refreshToken,
    csrfToken,
    expiresAt: accessExpiresAt.toISOString(),
    refreshExpiresAt: refreshExpiresAt.toISOString(),
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      institutionId: user.institutionId
    }
  };
}

async function incrementNonceAttempts(nonce) {
  await prisma.authNonce.update({
    where: { nonce },
    data: {
      attempts: {
        increment: 1
      }
    }
  });
}

async function createSessionForUser({ user, userAgent, ipAddress }) {
  const csrfToken = generateCsrfToken();
  const csrfTokenHash = hashToken(csrfToken);
  const sessionExpiresAt = getSessionExpiry();

  const session = await prisma.authSession.create({
    data: {
      userId: user.id,
      walletAddress: user.walletAddress,
      chainId: env.CHAIN_ID,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
      csrfTokenHash: env.AUTH_COOKIE_ENABLED ? csrfTokenHash : null,
      expiresAt: sessionExpiresAt
    }
  });

  const access = signAccessToken({
    sub: user.id,
    walletAddress: user.walletAddress,
    role: user.role,
    institutionId: user.institutionId,
    sessionId: session.id
  });

  const refresh = signRefreshToken({
    sub: user.id,
    sessionId: session.id
  });

  await prisma.refreshToken.create({
    data: {
      id: refresh.tokenId,
      sessionId: session.id,
      tokenHash: hashToken(refresh.token),
      expiresAt: refresh.expiresAt
    }
  });

  return toAuthResponse({
    user,
    accessToken: access.token,
    refreshToken: refresh.token,
    csrfToken,
    accessExpiresAt: access.expiresAt,
    refreshExpiresAt: refresh.expiresAt
  });
}

export async function createNonce({ address, ipAddress }) {
  const normalizedAddress = normalizeAddress(address);
  const nonce = generateNonce();
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + env.NONCE_TTL_SECONDS * 1000);

  await prisma.authNonce.create({
    data: {
      walletAddress: normalizedAddress,
      nonce,
      ipAddress: ipAddress ?? null,
      expiresAt
    }
  });

  const message = new SiweMessage({
    domain: env.SIWE_DOMAIN,
    address: ethers.getAddress(normalizedAddress),
    statement: "Sign in to Vindicate.",
    uri: env.SIWE_URI,
    version: "1",
    chainId: env.CHAIN_ID,
    nonce,
    issuedAt: issuedAt.toISOString(),
    expirationTime: expiresAt.toISOString()
  });

  return {
    nonce,
    message: message.prepareMessage(),
    expiresAt: expiresAt.toISOString()
  };
}

export async function verifySiweLogin({ messageText, signature, userAgent, ipAddress }) {
  let parsedMessage;
  try {
    parsedMessage = new SiweMessage(messageText);
  } catch (error) {
    throw new AppError(400, "SIWE_INVALID_MESSAGE", "Invalid SIWE message", undefined, error);
  }

  assertSiweContext(parsedMessage);

  const normalizedAddress = normalizeAddress(parsedMessage.address);
  const nonceRecord = await prisma.authNonce.findUnique({
    where: { nonce: parsedMessage.nonce }
  });

  ensureNonceUsable(nonceRecord, normalizedAddress);

  let verification;
  try {
    verification = await parsedMessage.verify({
      signature,
      nonce: parsedMessage.nonce,
      domain: env.SIWE_DOMAIN
    });
  } catch (error) {
    await incrementNonceAttempts(parsedMessage.nonce);
    throw new AppError(401, "SIWE_SIGNATURE_INVALID", "Signature verification failed", undefined, error);
  }

  if (!verification.success) {
    await incrementNonceAttempts(parsedMessage.nonce);
    throw new AppError(401, "SIWE_SIGNATURE_INVALID", "Signature verification failed");
  }

  const user = await prisma.$transaction(async (tx) => {
    const consumed = await tx.authNonce.updateMany({
      where: {
        nonce: parsedMessage.nonce,
        usedAt: null
      },
      data: {
        usedAt: new Date()
      }
    });

    if (consumed.count !== 1) {
      throw new AppError(401, "SIWE_NONCE_USED", "Nonce already used");
    }

    return tx.user.upsert({
      where: { walletAddress: normalizedAddress },
      create: {
        walletAddress: normalizedAddress,
        role: ROLES.STUDENT
      },
      update: {}
    });
  });

  return createSessionForUser({
    user,
    userAgent,
    ipAddress
  });
}

async function revokeSessionAndTokens(sessionId, reason) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.authSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null
      },
      data: {
        revokedAt: now,
        revokeReason: reason
      }
    });

    await tx.refreshToken.updateMany({
      where: {
        sessionId,
        revokedAt: null
      },
      data: {
        revokedAt: now
      }
    });
  });
}

export async function refreshSession({ refreshToken, csrfToken, userAgent, ipAddress }) {
  if (!refreshToken) {
    throw new AppError(401, "AUTH_REFRESH_REQUIRED", "Refresh token is required");
  }

  const payload = verifyRefreshToken(refreshToken);
  const refreshTokenHash = hashToken(refreshToken);
  const refreshRecord = await prisma.refreshToken.findUnique({
    where: { id: payload.jti },
    include: {
      session: {
        include: {
          user: true
        }
      }
    }
  });

  if (!refreshRecord || refreshRecord.tokenHash !== refreshTokenHash) {
    throw new AppError(401, "AUTH_REFRESH_INVALID", "Invalid refresh token");
  }

  if (refreshRecord.revokedAt || refreshRecord.expiresAt.getTime() <= Date.now()) {
    if (refreshRecord.replacedByTokenId) {
      await revokeSessionAndTokens(refreshRecord.sessionId, "refresh_token_replay");
      throw new AppError(401, "AUTH_REFRESH_REPLAY", "Refresh token replay detected");
    }
    throw new AppError(401, "AUTH_REFRESH_EXPIRED", "Refresh token expired");
  }

  const session = refreshRecord.session;
  if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    throw new AppError(401, "AUTH_SESSION_EXPIRED", "Session expired");
  }

  if (env.AUTH_COOKIE_ENABLED) {
    if (!csrfToken || session.csrfTokenHash !== hashToken(csrfToken)) {
      throw new AppError(403, "CSRF_INVALID", "Invalid CSRF token");
    }
  }

  const nextRefresh = signRefreshToken({
    sub: payload.sub,
    sessionId: payload.sessionId
  });
  const nextAccess = signAccessToken({
    sub: session.user.id,
    walletAddress: session.user.walletAddress,
    role: session.user.role,
    institutionId: session.user.institutionId,
    sessionId: session.id
  });
  const nextCsrfToken = generateCsrfToken();

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { id: refreshRecord.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: nextRefresh.tokenId
      }
    });

    await tx.refreshToken.create({
      data: {
        id: nextRefresh.tokenId,
        sessionId: session.id,
        tokenHash: hashToken(nextRefresh.token),
        expiresAt: nextRefresh.expiresAt
      }
    });

    await tx.authSession.update({
      where: { id: session.id },
      data: {
        userAgent: userAgent ?? session.userAgent,
        ipAddress: ipAddress ?? session.ipAddress,
        lastSeenAt: new Date(),
        csrfTokenHash: env.AUTH_COOKIE_ENABLED ? hashToken(nextCsrfToken) : null
      }
    });
  });

  return toAuthResponse({
    user: session.user,
    accessToken: nextAccess.token,
    refreshToken: nextRefresh.token,
    csrfToken: nextCsrfToken,
    accessExpiresAt: nextAccess.expiresAt,
    refreshExpiresAt: nextRefresh.expiresAt
  });
}

export async function blockAccessToken({ jti, userId, expiresAt, reason }) {
  if (!jti || !expiresAt) {
    return;
  }

  await prisma.tokenBlocklist.upsert({
    where: { jti },
    update: {
      expiresAt,
      reason,
      userId: userId ?? null
    },
    create: {
      jti,
      expiresAt,
      reason,
      userId: userId ?? null
    }
  });
}

export async function logoutSession({ auth, refreshToken, allSessions = false }) {
  const now = new Date();
  const accessExpiresAt =
    typeof auth.exp === "number" ? new Date(auth.exp * 1000) : new Date(now.getTime() + 15 * 60 * 1000);

  await blockAccessToken({
    jti: auth.jti,
    userId: auth.sub,
    expiresAt: accessExpiresAt,
    reason: allSessions ? "logout_all" : "logout"
  });

  if (allSessions) {
    await prisma.$transaction(async (tx) => {
      await tx.authSession.updateMany({
        where: {
          userId: auth.sub,
          revokedAt: null
        },
        data: {
          revokedAt: now,
          revokeReason: "logout_all"
        }
      });

      await tx.refreshToken.updateMany({
        where: {
          session: { userId: auth.sub },
          revokedAt: null
        },
        data: {
          revokedAt: now
        }
      });
    });
  } else {
    await revokeSessionAndTokens(auth.sessionId, "logout");
  }

  if (refreshToken) {
    try {
      const refreshPayload = verifyRefreshToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: {
          id: refreshPayload.jti,
          revokedAt: null
        },
        data: {
          revokedAt: now
        }
      });
    } catch {
      // Ignore malformed refresh token on logout; access token is still revoked.
    }
  }

  return {
    loggedOut: true,
    allSessions
  };
}

export async function revokeUserSessions(userId, reason) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.authSession.updateMany({
      where: {
        userId,
        revokedAt: null
      },
      data: {
        revokedAt: now,
        revokeReason: reason
      }
    });

    await tx.refreshToken.updateMany({
      where: {
        session: {
          userId
        },
        revokedAt: null
      },
      data: {
        revokedAt: now
      }
    });
  });
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      institution: true,
      issuerProfile: true
    }
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  return user;
}
