import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { z } from "zod";

const optionalUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().optional()
);
const optionalStringSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional()
);

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
  SENTRY_DSN: optionalUrlSchema,
  AUDIT_LOG_ENABLED: z.string().optional(),
  AUDIT_LOG_DIR: z.string().default(".dist/audit"),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(3650),
  AUDIT_RETENTION_CHECK_INTERVAL_MINUTES: z.coerce.number().int().positive().default(60),
  API_GOVERNANCE_ENABLED: z.string().optional(),
  API_GOVERNANCE_STORE_PATH: z.string().default(".dist/security/api-clients.json"),
  API_USAGE_LOG_PATH: z.string().default(".dist/security/api-usage.jsonl"),
  API_CLIENT_BOOTSTRAP_JSON: optionalStringSchema,
  API_TIER_LIMITS_JSON: optionalStringSchema,
  API_KEY_HEADER_NAME: z.string().default("x-api-key"),
  API_KEY_REQUIRED_PATH_PREFIXES: z.string().default(""),
  API_DEPRECATION_POLICY_URL: z.string().url().default("https://docs.vindicate.example/api/deprecations"),
  API_V0_SUNSET_AT: z.string().datetime().default("2027-01-01T00:00:00.000Z"),
  ALERT_WEBHOOK_URL: optionalUrlSchema,
  SLACK_WEBHOOK_URL: optionalUrlSchema,
  EMAIL_ALERT_WEBHOOK_URL: optionalUrlSchema,
  ANOMALY_VERIFY_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  ANOMALY_VERIFY_SPIKE_THRESHOLD: z.coerce.number().int().positive().default(500),
  ANOMALY_CREDENTIAL_VERIFY_SPIKE_THRESHOLD: z.coerce.number().int().positive().default(80),
  ANOMALY_ISSUER_WINDOW_SECONDS: z.coerce.number().int().positive().default(3600),
  ANOMALY_ISSUER_ISSUANCE_THRESHOLD: z.coerce.number().int().positive().default(50),
  ANOMALY_ALERT_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(300),
  SLO_VERIFICATION_LATENCY_MS: z.coerce.number().int().positive().default(1200),
  SLO_ISSUANCE_LATENCY_MS: z.coerce.number().int().positive().default(8000),
  SLO_ALERT_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(300),
  KEY_MANAGER_MODE: z.enum(["local", "aws_kms", "gcp_kms", "azure_keyvault"]).default("local"),
  KEY_MANAGER_KEY_ID: optionalStringSchema,
  KEY_MANAGER_ENCRYPTION_CONTEXT: optionalStringSchema,
  ENCRYPTED_BACKEND_PRIVATE_KEY: optionalStringSchema,
  AWS_KMS_DECRYPT_ENDPOINT: optionalUrlSchema,
  GCP_KMS_DECRYPT_ENDPOINT: optionalUrlSchema,
  AZURE_KV_DECRYPT_ENDPOINT: optionalUrlSchema,
  ALLOW_LOCAL_KEYS_IN_PRODUCTION: z.string().optional(),
  DID_ETHR_NETWORK: optionalStringSchema,
  DID_DOCUMENT_SERVICE_URL: optionalUrlSchema,
  VC_ISSUER_PRIVATE_KEYS_JSON: optionalStringSchema,
  VC_DEFAULT_CONTEXTS: z.string().default("https://www.w3.org/2018/credentials/v1"),
  VC_DEFAULT_TYPES: z.string().default("VerifiableCredential,VindicateCredential"),
  VC_OFFLINE_QR_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  VC_PROOF_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(31536000),
  ZK_PROOF_MODE: z.enum(["mock", "groth16"]).default("mock"),
  ZK_CHALLENGE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  ZK_VERIFICATION_KEY_PATH: optionalStringSchema,
  ZK_PUBLIC_SIGNAL_INDEX_CHALLENGE: z.coerce.number().int().min(0).default(0),
  MULTICHAIN_RPC_URLS_JSON: optionalStringSchema,
  MULTICHAIN_CONTRACT_ADDRESSES_JSON: optionalStringSchema
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

function parseBooleanFlag(value) {
  return typeof value === "string" && ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

const enableMetrics = parseBooleanFlag(raw.ENABLE_METRICS);
const auditLogEnabled = parseBooleanFlag(raw.AUDIT_LOG_ENABLED);
const apiGovernanceEnabled = parseBooleanFlag(raw.API_GOVERNANCE_ENABLED);
const allowLocalKeysInProduction = parseBooleanFlag(raw.ALLOW_LOCAL_KEYS_IN_PRODUCTION);

const authCookieEnabled = parseBooleanFlag(raw.AUTH_COOKIE_ENABLED);

const authCookieSecure =
  typeof raw.AUTH_COOKIE_SECURE === "string"
    ? parseBooleanFlag(raw.AUTH_COOKIE_SECURE)
    : raw.NODE_ENV === "production";

const apiKeyRequiredPathPrefixes = raw.API_KEY_REQUIRED_PATH_PREFIXES.split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

if (raw.NODE_ENV === "production" && raw.KEY_MANAGER_MODE === "local" && !allowLocalKeysInProduction) {
  throw new Error(
    "Invalid environment configuration: KEY_MANAGER_MODE=local is blocked in production unless ALLOW_LOCAL_KEYS_IN_PRODUCTION=true"
  );
}

if (raw.KEY_MANAGER_MODE !== "local") {
  if (!raw.KEY_MANAGER_KEY_ID || !raw.ENCRYPTED_BACKEND_PRIVATE_KEY) {
    throw new Error(
      "Invalid environment configuration: non-local key manager requires KEY_MANAGER_KEY_ID and ENCRYPTED_BACKEND_PRIVATE_KEY"
    );
  }

  if (raw.KEY_MANAGER_MODE === "aws_kms" && !raw.AWS_KMS_DECRYPT_ENDPOINT) {
    throw new Error("Invalid environment configuration: AWS_KMS_DECRYPT_ENDPOINT is required");
  }
  if (raw.KEY_MANAGER_MODE === "gcp_kms" && !raw.GCP_KMS_DECRYPT_ENDPOINT) {
    throw new Error("Invalid environment configuration: GCP_KMS_DECRYPT_ENDPOINT is required");
  }
  if (raw.KEY_MANAGER_MODE === "azure_keyvault" && !raw.AZURE_KV_DECRYPT_ENDPOINT) {
    throw new Error("Invalid environment configuration: AZURE_KV_DECRYPT_ENDPOINT is required");
  }
}

const knownDevPrivateKeys = new Set([
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f09453867e47f6d6f4f1c6f5f3a7b7b6f5f3d8a9"
]);

if (
  raw.NODE_ENV !== "development" &&
  raw.KEY_MANAGER_MODE === "local" &&
  knownDevPrivateKeys.has(raw.BACKEND_PRIVATE_KEY.toLowerCase())
) {
  throw new Error(
    "Invalid environment configuration: BACKEND_PRIVATE_KEY uses a known development key while KEY_MANAGER_MODE=local"
  );
}

function parseJsonObject(rawValue, label) {
  if (!rawValue) {
    return {};
  }

  let parsedValue;
  try {
    parsedValue = JSON.parse(rawValue);
  } catch {
    throw new Error(`Invalid environment configuration: ${label} must be valid JSON object`);
  }

  if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
    throw new Error(`Invalid environment configuration: ${label} must be JSON object`);
  }

  return parsedValue;
}

const issuerPrivateKeysMap = parseJsonObject(
  raw.VC_ISSUER_PRIVATE_KEYS_JSON,
  "VC_ISSUER_PRIVATE_KEYS_JSON"
);
for (const [did, privateKey] of Object.entries(issuerPrivateKeysMap)) {
  if (!did.startsWith("did:ethr:")) {
    throw new Error(
      "Invalid environment configuration: VC_ISSUER_PRIVATE_KEYS_JSON keys must be did:ethr DIDs"
    );
  }
  if (typeof privateKey !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error(
      `Invalid environment configuration: issuer private key for ${did} must be 32-byte hex`
    );
  }
}

const multichainRpcUrls = parseJsonObject(raw.MULTICHAIN_RPC_URLS_JSON, "MULTICHAIN_RPC_URLS_JSON");
for (const [chainId, rpcUrl] of Object.entries(multichainRpcUrls)) {
  if (!/^[0-9]+$/.test(chainId)) {
    throw new Error("Invalid environment configuration: MULTICHAIN_RPC_URLS_JSON keys must be chain IDs");
  }
  if (typeof rpcUrl !== "string" || rpcUrl.length === 0) {
    throw new Error("Invalid environment configuration: MULTICHAIN_RPC_URLS_JSON values must be RPC URLs");
  }
}

const multichainContractAddressesRaw = parseJsonObject(
  raw.MULTICHAIN_CONTRACT_ADDRESSES_JSON,
  "MULTICHAIN_CONTRACT_ADDRESSES_JSON"
);
const multichainContractAddresses = {};
for (const [chainId, contractAddress] of Object.entries(multichainContractAddressesRaw)) {
  if (!/^[0-9]+$/.test(chainId)) {
    throw new Error(
      "Invalid environment configuration: MULTICHAIN_CONTRACT_ADDRESSES_JSON keys must be chain IDs"
    );
  }
  if (typeof contractAddress !== "string" || !ethers.isAddress(contractAddress)) {
    throw new Error(
      `Invalid environment configuration: MULTICHAIN contract address for ${chainId} is invalid`
    );
  }
  multichainContractAddresses[chainId] = ethers.getAddress(contractAddress);
}

const vcDefaultContexts = raw.VC_DEFAULT_CONTEXTS.split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
if (vcDefaultContexts.length === 0) {
  throw new Error("Invalid environment configuration: VC_DEFAULT_CONTEXTS must include at least one context");
}

const vcDefaultTypes = raw.VC_DEFAULT_TYPES.split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
if (vcDefaultTypes.length === 0) {
  throw new Error("Invalid environment configuration: VC_DEFAULT_TYPES must include at least one type");
}

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
  AUDIT_LOG_ENABLED: auditLogEnabled,
  API_GOVERNANCE_ENABLED: apiGovernanceEnabled,
  ALLOW_LOCAL_KEYS_IN_PRODUCTION: allowLocalKeysInProduction,
  API_KEY_REQUIRED_PATH_PREFIXES: apiKeyRequiredPathPrefixes,
  AUTH_COOKIE_ENABLED: authCookieEnabled,
  AUTH_COOKIE_SECURE: authCookieSecure,
  DID_ETHR_NETWORK: raw.DID_ETHR_NETWORK ?? String(raw.CHAIN_ID),
  VC_ISSUER_PRIVATE_KEYS: issuerPrivateKeysMap,
  VC_DEFAULT_CONTEXTS: vcDefaultContexts,
  VC_DEFAULT_TYPES: vcDefaultTypes,
  MULTICHAIN_RPC_URLS: multichainRpcUrls,
  MULTICHAIN_CONTRACT_ADDRESSES: multichainContractAddresses
});
