import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { AppError } from "../../utils/app-error.js";
import { env } from "../../config/env.js";

const DEFAULT_TIER_LIMITS = Object.freeze({
  internal: 1000,
  partner: 300,
  public: 120
});

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateApiKey(clientId) {
  return `vk_${clientId}_${crypto.randomBytes(24).toString("base64url")}`;
}

function normalizeTier(value) {
  return String(value ?? "public").trim().toLowerCase();
}

function parseTierLimits(raw) {
  if (!raw) {
    return DEFAULT_TIER_LIMITS;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_TIER_LIMITS;
  }

  const merged = { ...DEFAULT_TIER_LIMITS };
  for (const [tier, limit] of Object.entries(parsed)) {
    const normalizedTier = normalizeTier(tier);
    const parsedLimit = Number(limit);
    if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
      merged[normalizedTier] = parsedLimit;
    }
  }
  return merged;
}

class ApiGovernanceService {
  constructor() {
    this.storePath = path.resolve(process.cwd(), env.API_GOVERNANCE_STORE_PATH);
    this.usageLogPath = path.resolve(process.cwd(), env.API_USAGE_LOG_PATH);
    this.tierLimits = parseTierLimits(env.API_TIER_LIMITS_JSON);
    this.store = {
      version: 1,
      clients: {}
    };
    this.writeQueue = Promise.resolve();
    this.loaded = false;
    this.usageCounters = new Map();
  }

  async init() {
    if (this.loaded || !env.API_GOVERNANCE_ENABLED) {
      return;
    }

    await fs.mkdir(path.dirname(this.storePath), { recursive: true });
    await fs.mkdir(path.dirname(this.usageLogPath), { recursive: true });

    try {
      const raw = await fs.readFile(this.storePath, "utf8");
      this.store = JSON.parse(raw);
    } catch {
      this.store = {
        version: 1,
        clients: this._bootstrapClients()
      };
      await this._persistStore();
    }

    this.loaded = true;
  }

  getTierLimit(tier) {
    const normalizedTier = normalizeTier(tier);
    return this.tierLimits[normalizedTier] ?? env.RATE_LIMIT_MAX;
  }

  async validateApiKey(rawKey) {
    if (!env.API_GOVERNANCE_ENABLED) {
      return null;
    }

    await this.init();

    const keyHash = sha256(rawKey);
    const now = Date.now();

    for (const [clientId, client] of Object.entries(this.store.clients ?? {})) {
      if (client.status !== "active") {
        continue;
      }

      for (const key of client.keys ?? []) {
        const revoked = Boolean(key.revokedAt);
        const expired = key.expiresAt ? new Date(key.expiresAt).getTime() <= now : false;

        if (!revoked && !expired && key.keyHash === keyHash) {
          key.lastUsedAt = new Date().toISOString();
          this._persistStore();
          return {
            clientId,
            name: client.name,
            tier: normalizeTier(client.tier),
            keyId: key.keyId
          };
        }
      }
    }

    throw new AppError(401, "API_KEY_INVALID", "Invalid or expired API key");
  }

  async rotateClientKey(clientId, { actorId, expiresInDays = 90, tier, name } = {}) {
    if (!env.API_GOVERNANCE_ENABLED) {
      throw new AppError(400, "API_GOVERNANCE_DISABLED", "API governance is disabled");
    }

    await this.init();

    const normalizedClientId = clientId.trim().toLowerCase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    const keyId = crypto.randomUUID();
    const plaintextKey = generateApiKey(normalizedClientId);

    const existingClient = this.store.clients[normalizedClientId] ?? {
      name: name ?? normalizedClientId,
      tier: tier ? normalizeTier(tier) : "public",
      status: "active",
      keys: [],
      createdAt: now.toISOString(),
      createdBy: actorId ?? null
    };

    for (const key of existingClient.keys) {
      if (!key.revokedAt) {
        key.revokedAt = now.toISOString();
        key.revokedBy = actorId ?? null;
      }
    }

    existingClient.name = name ?? existingClient.name;
    existingClient.tier = normalizeTier(tier ?? existingClient.tier);
    existingClient.status = "active";
    existingClient.keys.push({
      keyId,
      keyHash: sha256(plaintextKey),
      createdAt: now.toISOString(),
      expiresAt,
      revokedAt: null,
      createdBy: actorId ?? null,
      lastUsedAt: null
    });

    this.store.clients[normalizedClientId] = existingClient;
    await this._persistStore();

    return {
      clientId: normalizedClientId,
      tier: existingClient.tier,
      keyId,
      plaintextKey,
      expiresAt
    };
  }

  async recordUsage({ clientId, tier, route, method, statusCode }) {
    if (!env.API_GOVERNANCE_ENABLED) {
      return;
    }

    await this.init();

    const bucket = new Date().toISOString().slice(0, 16);
    const metricKey = `${bucket}|${clientId ?? "anonymous"}|${method}|${route}|${statusCode}`;

    this.usageCounters.set(metricKey, (this.usageCounters.get(metricKey) ?? 0) + 1);

    const usageRecord = {
      timestamp: new Date().toISOString(),
      clientId: clientId ?? null,
      tier: tier ?? null,
      route,
      method,
      statusCode
    };

    await fs.appendFile(this.usageLogPath, `${JSON.stringify(usageRecord)}\n`, "utf8");
  }

  getUsageSnapshot({ sinceMinutes = 60 } = {}) {
    const cutoff = Date.now() - sinceMinutes * 60 * 1000;
    const result = {};

    for (const [key, count] of this.usageCounters.entries()) {
      const [bucket, clientId, method, route, statusCode] = key.split("|");
      const bucketTime = new Date(`${bucket}:00Z`).getTime();
      if (Number.isNaN(bucketTime) || bucketTime < cutoff) {
        continue;
      }

      const aggregateKey = `${clientId}|${method}|${route}|${statusCode}`;
      result[aggregateKey] = (result[aggregateKey] ?? 0) + count;
    }

    return Object.entries(result).map(([composite, count]) => {
      const [clientId, method, route, statusCode] = composite.split("|");
      return {
        clientId,
        method,
        route,
        statusCode: Number(statusCode),
        count
      };
    });
  }

  _bootstrapClients() {
    if (!env.API_CLIENT_BOOTSTRAP_JSON) {
      return {};
    }

    let parsed;
    try {
      parsed = JSON.parse(env.API_CLIENT_BOOTSTRAP_JSON);
    } catch {
      return {};
    }

    if (!Array.isArray(parsed)) {
      return {};
    }

    const now = new Date().toISOString();
    const clients = {};

    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const clientId = String(entry.clientId ?? "").trim().toLowerCase();
      if (!clientId) {
        continue;
      }

      const rawKey = typeof entry.apiKey === "string" ? entry.apiKey : null;
      if (!rawKey) {
        continue;
      }

      clients[clientId] = {
        name: String(entry.name ?? clientId),
        tier: normalizeTier(entry.tier ?? "public"),
        status: "active",
        createdAt: now,
        keys: [
          {
            keyId: crypto.randomUUID(),
            keyHash: sha256(rawKey),
            createdAt: now,
            expiresAt: entry.expiresAt ?? null,
            revokedAt: null,
            createdBy: "bootstrap",
            lastUsedAt: null
          }
        ]
      };
    }

    return clients;
  }

  async _persistStore() {
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.writeFile(this.storePath, `${JSON.stringify(this.store, null, 2)}\n`, "utf8");
    });

    await this.writeQueue;
  }
}

export const apiGovernanceService = new ApiGovernanceService();