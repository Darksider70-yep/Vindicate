import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { z } from "zod";

const runtimeNodeEnv = process.env.NODE_ENV ?? "development";
const rootDir = process.cwd();
const baseEnvPath = path.join(rootDir, ".env");
const envByStagePath = path.join(rootDir, `.env.${runtimeNodeEnv}`);

if (fs.existsSync(baseEnvPath)) {
  dotenv.config({ path: baseEnvPath });
}

if (fs.existsSync(envByStagePath)) {
  dotenv.config({ path: envByStagePath, override: true });
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60),
  AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60),
  AUTH_COOKIE_ENABLED: z.string().optional(),
  AUTH_COOKIE_NAME_REFRESH: z.string().default("vindicate_rt"),
  AUTH_COOKIE_NAME_CSRF: z.string().default("vindicate_csrf"),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  AUTH_COOKIE_SECURE: z.string().optional(),
  CSRF_HEADER_NAME: z.string().default("x-csrf-token"),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  SIWE_MAX_VERIFICATION_ATTEMPTS: z.coerce.number().int().positive().default(5),
  CORS_ALLOWED_ORIGINS: z.string().min(1),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  UPLOAD_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  UPLOAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  VERIFY_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  VERIFY_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  JSON_BODY_LIMIT: z.string().default("100kb"),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  ALLOWED_UPLOAD_MIME_TYPES: z.string().default("application/pdf,image/png,image/jpeg"),
  RPC_URLS: z.string().min(1),
  CHAIN_ID: z.coerce.number().int().positive(),
  CONTRACT_ADDRESS: z.string().min(1),
  BACKEND_PRIVATE_KEY: z.string().min(1),
  BLOCKCHAIN_TX_RETRIES: z.coerce.number().int().min(0).default(3),
  BLOCKCHAIN_TX_RETRY_DELAY_MS: z.coerce.number().int().positive().default(1_000),
  BLOCKCHAIN_CALL_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  TX_CONFIRMATIONS: z.coerce.number().int().positive().default(1),
  TX_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  IPFS_PRIMARY_API_URL: z.string().url().optional(),
  IPFS_BACKUP_API_URLS: z.string().optional(),
  IPFS_API_URL: z.string().url().optional(),
  IPFS_GATEWAY_URL: z.string().url(),
  IPFS_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  IPFS_RETRY_ATTEMPTS: z.coerce.number().int().min(0).default(3),
  IPFS_RETRY_DELAY_MS: z.coerce.number().int().positive().default(750),
  IPFS_MIN_PIN_REPLICAS: z.coerce.number().int().positive().default(2),
  PINATA_API_URL: z.string().url().default("https://api.pinata.cloud"),
  PINATA_JWT: z.string().optional(),
  IPFS_ENCRYPTION_KEY: z.string().optional(),
  HASH_BLACKLIST: z.string().optional(),
  PUBLIC_VERIFY_BASE_URL: z.string().url(),
  QR_SIGNING_SECRET: z.string().min(32),
  NONCE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  SIWE_DOMAIN: z.string().min(1),
  SIWE_URI: z.string().url(),
  ENABLE_METRICS: z.string().optional(),
  SENTRY_DSN: z.string().url().optional()
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const formatted = parsed.error.issues.map((issue) => {
    const pathLabel = issue.path.join(".") || "unknown";
    return `${pathLabel}: ${issue.message}`;
  });
  throw new Error(`Invalid environment configuration:\n${formatted.join("\n")}`);
}

const raw = parsed.data;
const rpcUrls = raw.RPC_URLS.split(",")
  .map((url) => url.trim())
  .filter(Boolean);

if (rpcUrls.length === 0) {
  throw new Error("Invalid environment configuration: RPC_URLS must contain at least one URL");
}

const primaryIpfsApiUrl = raw.IPFS_PRIMARY_API_URL ?? raw.IPFS_API_URL;
if (!primaryIpfsApiUrl) {
  throw new Error(
    "Invalid environment configuration: set IPFS_PRIMARY_API_URL (or legacy IPFS_API_URL)"
  );
}

if (!ethers.isAddress(raw.CONTRACT_ADDRESS)) {
  throw new Error("Invalid environment configuration: CONTRACT_ADDRESS must be a valid address");
}

const accessSecret = raw.JWT_ACCESS_SECRET ?? raw.JWT_SECRET;
const refreshSecret = raw.JWT_REFRESH_SECRET ?? raw.JWT_SECRET;
if (!accessSecret || !refreshSecret) {
  throw new Error(
    "Invalid environment configuration: set JWT_SECRET or both JWT_ACCESS_SECRET and JWT_REFRESH_SECRET"
  );
}

if (!/^0x[0-9a-fA-F]{64}$/.test(raw.BACKEND_PRIVATE_KEY)) {
  throw new Error("Invalid environment configuration: BACKEND_PRIVATE_KEY must be a 32-byte hex string");
}

if (
  raw.IPFS_ENCRYPTION_KEY &&
  !/^(0x)?[0-9a-fA-F]{64}$/.test(raw.IPFS_ENCRYPTION_KEY)
) {
  throw new Error(
    "Invalid environment configuration: IPFS_ENCRYPTION_KEY must be 32-byte hex when provided"
  );
}

const allowedOrigins = raw.CORS_ALLOWED_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  throw new Error(
    "Invalid environment configuration: CORS_ALLOWED_ORIGINS must include at least one origin"
  );
}

const normalizedEncryptionKey = raw.IPFS_ENCRYPTION_KEY
  ? raw.IPFS_ENCRYPTION_KEY.startsWith("0x")
    ? raw.IPFS_ENCRYPTION_KEY.slice(2)
    : raw.IPFS_ENCRYPTION_KEY
  : null;

const backupIpfsApiUrls = (raw.IPFS_BACKUP_API_URLS ?? "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

const uploadMimeTypes = raw.ALLOWED_UPLOAD_MIME_TYPES.split(",")
  .map((mime) => mime.trim().toLowerCase())
  .filter(Boolean);

const hashBlacklist = (raw.HASH_BLACKLIST ?? "")
  .split(",")
  .map((hash) => hash.trim().toLowerCase())
  .filter(Boolean);

if (uploadMimeTypes.length === 0) {
  throw new Error(
    "Invalid environment configuration: ALLOWED_UPLOAD_MIME_TYPES must include at least one mime type"
  );
}

if (raw.IPFS_MIN_PIN_REPLICAS > backupIpfsApiUrls.length + 1) {
  throw new Error(
    "Invalid environment configuration: IPFS_MIN_PIN_REPLICAS exceeds configured IPFS providers"
  );
}

const enableMetrics =
  typeof raw.ENABLE_METRICS === "string" &&
  ["1", "true", "yes", "on"].includes(raw.ENABLE_METRICS.toLowerCase());

const authCookieEnabled =
  typeof raw.AUTH_COOKIE_ENABLED === "string" &&
  ["1", "true", "yes", "on"].includes(raw.AUTH_COOKIE_ENABLED.toLowerCase());

const authCookieSecure =
  typeof raw.AUTH_COOKIE_SECURE === "string"
    ? ["1", "true", "yes", "on"].includes(raw.AUTH_COOKIE_SECURE.toLowerCase())
    : raw.NODE_ENV === "production";

export const env = Object.freeze({
  ...raw,
  JWT_ACCESS_SECRET: accessSecret,
  JWT_REFRESH_SECRET: refreshSecret,
  RPC_URLS: rpcUrls,
  CORS_ALLOWED_ORIGINS: allowedOrigins,
  ALLOWED_UPLOAD_MIME_TYPES: uploadMimeTypes,
  HASH_BLACKLIST: hashBlacklist,
  CONTRACT_ADDRESS: ethers.getAddress(raw.CONTRACT_ADDRESS),
  IPFS_PRIMARY_API_URL: primaryIpfsApiUrl,
  IPFS_BACKUP_API_URLS: backupIpfsApiUrls,
  BACKEND_PRIVATE_KEY: raw.BACKEND_PRIVATE_KEY,
  IPFS_ENCRYPTION_KEY: normalizedEncryptionKey,
  ENABLE_METRICS: enableMetrics,
  AUTH_COOKIE_ENABLED: authCookieEnabled,
  AUTH_COOKIE_SECURE: authCookieSecure
});
