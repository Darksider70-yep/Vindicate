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
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("1h"),
  CORS_ALLOWED_ORIGINS: z.string().min(1),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  JSON_BODY_LIMIT: z.string().default("100kb"),
  RPC_URLS: z.string().min(1),
  CHAIN_ID: z.coerce.number().int().positive(),
  CONTRACT_ADDRESS: z.string().min(1),
  BACKEND_PRIVATE_KEY: z.string().min(1),
  BLOCKCHAIN_TX_RETRIES: z.coerce.number().int().min(0).default(3),
  BLOCKCHAIN_TX_RETRY_DELAY_MS: z.coerce.number().int().positive().default(1_000),
  BLOCKCHAIN_CALL_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  TX_CONFIRMATIONS: z.coerce.number().int().positive().default(1),
  TX_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  IPFS_API_URL: z.string().url(),
  IPFS_GATEWAY_URL: z.string().url(),
  IPFS_ENCRYPTION_KEY: z.string().optional(),
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

if (!ethers.isAddress(raw.CONTRACT_ADDRESS)) {
  throw new Error("Invalid environment configuration: CONTRACT_ADDRESS must be a valid address");
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

const enableMetrics =
  typeof raw.ENABLE_METRICS === "string" &&
  ["1", "true", "yes", "on"].includes(raw.ENABLE_METRICS.toLowerCase());

export const env = Object.freeze({
  ...raw,
  RPC_URLS: rpcUrls,
  CORS_ALLOWED_ORIGINS: allowedOrigins,
  CONTRACT_ADDRESS: ethers.getAddress(raw.CONTRACT_ADDRESS),
  BACKEND_PRIVATE_KEY: raw.BACKEND_PRIVATE_KEY,
  IPFS_ENCRYPTION_KEY: normalizedEncryptionKey,
  ENABLE_METRICS: enableMetrics
});
