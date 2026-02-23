import { env } from "../config/env.js";
import {
  createNonce,
  getCurrentUser,
  logoutSession,
  refreshSession,
  verifySiweLogin
} from "../services/auth/siwe.service.js";

function getRequestIp(req) {
  const forwarded = req.header("x-forwarded-for");
  if (!forwarded) {
    return req.ip;
  }
  const [first] = forwarded.split(",");
  return first.trim();
}

function getCookieOptions(maxAgeMs, isHttpOnly) {
  return {
    httpOnly: isHttpOnly,
    secure: env.AUTH_COOKIE_SECURE,
    sameSite: env.AUTH_COOKIE_SAME_SITE,
    domain: env.AUTH_COOKIE_DOMAIN || undefined,
    path: "/",
    maxAge: maxAgeMs
  };
}

function writeAuthCookies(res, authResult) {
  if (!env.AUTH_COOKIE_ENABLED) {
    return;
  }

  const refreshMaxAge = env.REFRESH_TOKEN_TTL_SECONDS * 1000;
  const csrfMaxAge = env.AUTH_SESSION_TTL_SECONDS * 1000;

  res.cookie(
    env.AUTH_COOKIE_NAME_REFRESH,
    authResult.refreshToken,
    getCookieOptions(refreshMaxAge, true)
  );
  res.cookie(
    env.AUTH_COOKIE_NAME_CSRF,
    authResult.csrfToken,
    getCookieOptions(csrfMaxAge, false)
  );
}

function clearAuthCookies(res) {
  if (!env.AUTH_COOKIE_ENABLED) {
    return;
  }

  res.clearCookie(env.AUTH_COOKIE_NAME_REFRESH, getCookieOptions(0, true));
  res.clearCookie(env.AUTH_COOKIE_NAME_CSRF, getCookieOptions(0, false));
}

function toAuthPayload(authResult) {
  return {
    accessToken: authResult.accessToken,
    refreshToken: env.AUTH_COOKIE_ENABLED ? undefined : authResult.refreshToken,
    csrfToken: authResult.csrfToken,
    expiresAt: authResult.expiresAt,
    refreshExpiresAt: authResult.refreshExpiresAt,
    user: authResult.user
  };
}

export async function issueNonce(req, res) {
  const challenge = await createNonce({
    address: req.body.address,
    ipAddress: getRequestIp(req)
  });

  return res.status(200).json({
    data: challenge
  });
}

export async function verifySignature(req, res) {
  const authResult = await verifySiweLogin({
    messageText: req.body.message,
    signature: req.body.signature,
    userAgent: req.header("user-agent"),
    ipAddress: getRequestIp(req)
  });

  writeAuthCookies(res, authResult);

  return res.status(200).json({
    data: toAuthPayload(authResult)
  });
}

export async function refresh(req, res) {
  const authResult = await refreshSession({
    refreshToken: req.body.refreshToken ?? req.cookies?.[env.AUTH_COOKIE_NAME_REFRESH],
    csrfToken: req.header(env.CSRF_HEADER_NAME) ?? req.cookies?.[env.AUTH_COOKIE_NAME_CSRF],
    userAgent: req.header("user-agent"),
    ipAddress: getRequestIp(req)
  });

  writeAuthCookies(res, authResult);

  return res.status(200).json({
    data: toAuthPayload(authResult)
  });
}

export async function logout(req, res) {
  const result = await logoutSession({
    auth: req.auth,
    refreshToken: req.body.refreshToken ?? req.cookies?.[env.AUTH_COOKIE_NAME_REFRESH],
    allSessions: req.body.allSessions
  });

  clearAuthCookies(res);

  return res.status(200).json({
    data: result
  });
}

export async function me(req, res) {
  const user = await getCurrentUser(req.auth.sub);
  return res.status(200).json({
    data: {
      id: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      institutionId: user.institutionId,
      institution: user.institution,
      issuerProfile: user.issuerProfile
    }
  });
}
