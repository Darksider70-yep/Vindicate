import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

function decodeHexPrivateKey(hexValue) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(hexValue)) {
    throw new Error("Invalid private key format");
  }
  return hexValue;
}

async function callExternalKmsDecrypt(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`KMS decrypt failed with status ${response.status}`);
  }

  const result = await response.json();
  if (typeof result.privateKey !== "string") {
    throw new Error("KMS decrypt response missing privateKey");
  }

  return decodeHexPrivateKey(result.privateKey);
}

class KeyManagementService {
  constructor() {
    this.cachedSignerKey = null;
    this.lastLoadedAt = null;
  }

  async getSignerPrivateKey() {
    if (this.cachedSignerKey) {
      return this.cachedSignerKey;
    }

    let key;
    if (env.KEY_MANAGER_MODE === "local") {
      key = env.BACKEND_PRIVATE_KEY;
    } else if (env.KEY_MANAGER_MODE === "aws_kms") {
      key = await callExternalKmsDecrypt(env.AWS_KMS_DECRYPT_ENDPOINT, {
        keyId: env.KEY_MANAGER_KEY_ID,
        encryptedPrivateKey: env.ENCRYPTED_BACKEND_PRIVATE_KEY,
        encryptionContext: env.KEY_MANAGER_ENCRYPTION_CONTEXT
      });
    } else if (env.KEY_MANAGER_MODE === "gcp_kms") {
      key = await callExternalKmsDecrypt(env.GCP_KMS_DECRYPT_ENDPOINT, {
        keyId: env.KEY_MANAGER_KEY_ID,
        encryptedPrivateKey: env.ENCRYPTED_BACKEND_PRIVATE_KEY,
        aad: env.KEY_MANAGER_ENCRYPTION_CONTEXT
      });
    } else if (env.KEY_MANAGER_MODE === "azure_keyvault") {
      key = await callExternalKmsDecrypt(env.AZURE_KV_DECRYPT_ENDPOINT, {
        keyId: env.KEY_MANAGER_KEY_ID,
        encryptedPrivateKey: env.ENCRYPTED_BACKEND_PRIVATE_KEY
      });
    } else {
      throw new Error(`Unsupported KEY_MANAGER_MODE: ${env.KEY_MANAGER_MODE}`);
    }

    this.cachedSignerKey = decodeHexPrivateKey(key);
    this.lastLoadedAt = new Date().toISOString();

    logger.info(
      {
        eventType: "key_manager_access",
        format: "siem_v1",
        keyManagerMode: env.KEY_MANAGER_MODE,
        keyId: env.KEY_MANAGER_KEY_ID,
        loadedAt: this.lastLoadedAt
      },
      "Signer key material loaded via key-management provider"
    );

    return this.cachedSignerKey;
  }

  async rotateKeyReference(nextEncryptedPrivateKey) {
    if (!nextEncryptedPrivateKey) {
      throw new Error("nextEncryptedPrivateKey is required");
    }

    const digest = crypto.createHash("sha256").update(nextEncryptedPrivateKey).digest("hex");

    logger.warn(
      {
        eventType: "key_rotation_requested",
        format: "siem_v1",
        keyManagerMode: env.KEY_MANAGER_MODE,
        keyId: env.KEY_MANAGER_KEY_ID,
        payloadDigest: digest
      },
      "Key rotation requested"
    );

    this.cachedSignerKey = null;
    this.lastLoadedAt = null;
  }
}

export const keyManagementService = new KeyManagementService();