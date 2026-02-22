import crypto from "node:crypto";
import { create } from "ipfs-http-client";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { stableStringify, toBytes32Hash } from "../../utils/canonical-json.js";
import { AppError } from "../../utils/app-error.js";
import { withRetry } from "../../utils/retry.js";

function assertCid(cid) {
  if (typeof cid !== "string" || cid.length < 20) {
    throw new AppError(400, "INVALID_CID", "Invalid CID format");
  }
}

function encryptCanonicalPayload(canonicalPayload, encryptionKeyHex) {
  const key = Buffer.from(encryptionKeyHex, "hex");
  if (key.length !== 32) {
    throw new AppError(500, "ENCRYPTION_KEY_INVALID", "IPFS encryption key must be 32 bytes");
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(canonicalPayload, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return {
    encrypted: true,
    alg: "aes-256-gcm",
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    ciphertext: encrypted.toString("hex")
  };
}

function decryptCanonicalPayload(encryptedPayload, encryptionKeyHex) {
  const key = Buffer.from(encryptionKeyHex, "hex");
  if (key.length !== 32) {
    throw new AppError(500, "ENCRYPTION_KEY_INVALID", "IPFS encryption key must be 32 bytes");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encryptedPayload.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(encryptedPayload.tag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPayload.ciphertext, "hex")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

class IpfsService {
  constructor() {
    this.client = create({
      url: env.IPFS_API_URL
    });
  }

  async assertConnectivity() {
    await this.client.version();
    logger.info("IPFS connectivity check passed");
  }

  async uploadCredentialPayload(payload, { encrypt = false } = {}) {
    const canonicalPayload = stableStringify(payload);
    const credentialHash = toBytes32Hash(canonicalPayload);
    const shouldEncrypt = Boolean(encrypt);

    if (shouldEncrypt && !env.IPFS_ENCRYPTION_KEY) {
      throw new AppError(
        500,
        "ENCRYPTION_KEY_MISSING",
        "IPFS_ENCRYPTION_KEY is required when encryption is enabled"
      );
    }

    const envelope = shouldEncrypt
      ? encryptCanonicalPayload(canonicalPayload, env.IPFS_ENCRYPTION_KEY)
      : {
          encrypted: false,
          payload
        };

    const serializedEnvelope = JSON.stringify(envelope);

    const addResult = await withRetry(
      async () => this.client.add(serializedEnvelope, { pin: true }),
      {
        retries: 3,
        delayMs: 750,
        onRetry: async (error, attempt, delay) => {
          logger.warn({ error: error.message, attempt, delay }, "Retrying IPFS upload");
        }
      }
    );

    const cid = addResult.cid.toString();
    assertCid(cid);
    await this.pinCid(cid);

    const integrityResult = await this.validateCredentialIntegrity(cid, credentialHash);
    if (!integrityResult.valid) {
      throw new AppError(
        500,
        "IPFS_INTEGRITY_MISMATCH",
        "Stored IPFS payload did not match expected credential hash",
        integrityResult
      );
    }

    return {
      cid,
      credentialHash,
      encrypted: shouldEncrypt
    };
  }

  async pinCid(cid) {
    assertCid(cid);
    await withRetry(async () => this.client.pin.add(cid), {
      retries: 3,
      delayMs: 500,
      onRetry: async (error, attempt, delay) => {
        logger.warn({ error: error.message, attempt, delay, cid }, "Retrying IPFS pin");
      }
    });
  }

  async fetchEnvelope(cid) {
    assertCid(cid);
    const stream = this.client.cat(cid);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const content = Buffer.concat(chunks).toString("utf8");
    return JSON.parse(content);
  }

  async fetchCredentialPayload(cid) {
    const envelope = await this.fetchEnvelope(cid);

    if (envelope.encrypted) {
      if (!env.IPFS_ENCRYPTION_KEY) {
        return {
          encrypted: true,
          payload: null,
          computedHash: null
        };
      }

      const canonicalPayload = decryptCanonicalPayload(envelope, env.IPFS_ENCRYPTION_KEY);
      return {
        encrypted: true,
        payload: JSON.parse(canonicalPayload),
        computedHash: toBytes32Hash(canonicalPayload)
      };
    }

    const canonicalPayload = stableStringify(envelope.payload);
    return {
      encrypted: false,
      payload: envelope.payload,
      computedHash: toBytes32Hash(canonicalPayload)
    };
  }

  async validateCredentialIntegrity(cid, expectedCredentialHash) {
    const fetched = await this.fetchCredentialPayload(cid);
    return {
      valid: fetched.computedHash === expectedCredentialHash,
      computedHash: fetched.computedHash,
      expectedHash: expectedCredentialHash
    };
  }
}

export const ipfsService = new IpfsService();
