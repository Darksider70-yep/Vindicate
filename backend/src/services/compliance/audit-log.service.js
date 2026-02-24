import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { sha256Hex, stableStringify } from "../../utils/canonical-json.js";

class AuditLogService {
  constructor() {
    this.logDir = path.resolve(process.cwd(), env.AUDIT_LOG_DIR);
    this.stateFile = path.join(this.logDir, "audit-state.json");
    this.lastHash = "GENESIS";
    this.writeQueue = Promise.resolve();
    this.retentionTimer = null;
    this.initialized = false;
  }

  async init() {
    if (!env.AUDIT_LOG_ENABLED || this.initialized) {
      return;
    }

    await fs.mkdir(this.logDir, { recursive: true });

    try {
      const raw = await fs.readFile(this.stateFile, "utf8");
      const parsed = JSON.parse(raw);
      if (typeof parsed.lastHash === "string" && parsed.lastHash.length > 0) {
        this.lastHash = parsed.lastHash;
      }
    } catch {
      await this._writeState();
    }

    this.initialized = true;
  }

  async record(event) {
    if (!env.AUDIT_LOG_ENABLED) {
      return;
    }

    await this.init();

    this.writeQueue = this.writeQueue.then(async () => {
      const now = new Date();
      const dateLabel = now.toISOString().slice(0, 10);
      const filePath = path.join(this.logDir, `audit-${dateLabel}.jsonl`);

      const baseRecord = {
        schemaVersion: "audit.v1",
        timestamp: now.toISOString(),
        service: "vindicate-backend",
        environment: env.NODE_ENV,
        ...event
      };

      const canonicalPayload = stableStringify(baseRecord);
      const entryHash = sha256Hex(`${this.lastHash}:${canonicalPayload}`);
      const record = {
        ...baseRecord,
        previousHash: this.lastHash,
        entryHash
      };

      await fs.appendFile(filePath, `${stableStringify(record)}\n`, "utf8");
      this.lastHash = entryHash;
      await this._writeState();
    }).catch((error) => {
      logger.error({ error: error.message }, "Failed to append audit log entry");
    });

    await this.writeQueue;
  }

  async recordAccess(req, res, outcome = "ALLOW") {
    if (!env.AUDIT_LOG_ENABLED) {
      return;
    }

    await this.record({
      eventType: "access",
      outcome,
      requestId: req.id,
      method: req.method,
      route: req.originalUrl,
      statusCode: res.statusCode,
      actorId: req.auth?.sub ?? null,
      actorRole: req.auth?.role ?? null,
      apiClientId: req.apiClient?.clientId ?? null,
      sourceIp: req.ip,
      userAgent: req.header("user-agent") ?? null
    });
  }

  async pruneExpiredLogs() {
    if (!env.AUDIT_LOG_ENABLED) {
      return;
    }

    await this.init();

    const retentionMs = env.AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const entries = await fs.readdir(this.logDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      if (!entry.name.startsWith("audit-") || !entry.name.endsWith(".jsonl")) {
        continue;
      }

      const fullPath = path.join(this.logDir, entry.name);
      const stats = await fs.stat(fullPath);
      const ageMs = now - stats.mtimeMs;
      if (ageMs > retentionMs) {
        await fs.unlink(fullPath);
      }
    }
  }

  startRetentionScheduler() {
    if (!env.AUDIT_LOG_ENABLED || this.retentionTimer) {
      return;
    }

    const intervalMs = env.AUDIT_RETENTION_CHECK_INTERVAL_MINUTES * 60 * 1000;
    this.retentionTimer = setInterval(() => {
      this.pruneExpiredLogs().catch((error) => {
        logger.error({ error: error.message }, "Audit retention sweep failed");
      });
    }, intervalMs);

    if (typeof this.retentionTimer.unref === "function") {
      this.retentionTimer.unref();
    }
  }

  stopRetentionScheduler() {
    if (!this.retentionTimer) {
      return;
    }
    clearInterval(this.retentionTimer);
    this.retentionTimer = null;
  }

  async _writeState() {
    await fs.writeFile(
      this.stateFile,
      `${JSON.stringify({ lastHash: this.lastHash, updatedAt: new Date().toISOString() }, null, 2)}\n`,
      "utf8"
    );
  }
}

export const auditLogService = new AuditLogService();
