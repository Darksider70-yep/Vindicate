import crypto from "node:crypto";
import { create } from "ipfs-http-client";
import { CID } from "multiformats/cid";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/app-error.js";
import { withRetry, withTimeout } from "../utils/retry.js";

const KEY_VERSION = 1;

function sha256Hex(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function toBytes32(checksumHex) {
  return `0x${checksumHex}`;
}

function normalizeCid(cid) {
  try {
    const parsed = CID.parse(cid);
    if (parsed.version !== 1) {
      throw new AppError(400, "INVALID_CID_VERSION", "Only CIDv1 is supported");
    }
    return parsed.toString();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "INVALID_CID", "Invalid CID");
  }
}

function validateBuffer(fileBuffer) {
  if (!Buffer.isBuffer(fileBuffer)) {
    throw new AppError(400, "INVALID_FILE", "File data must be a Buffer");
  }
  if (fileBuffer.length === 0) {
    throw new AppError(400, "EMPTY_FILE", "File payload cannot be empty");
  }
  if (fileBuffer.length > env.UPLOAD_MAX_BYTES) {
    throw new AppError(413, "FILE_TOO_LARGE", "File exceeds max upload size");
  }
}

function normalizeEncryptionKey() {
  if (!env.IPFS_ENCRYPTION_KEY) {
    throw new AppError(500, "ENCRYPTION_KEY_MISSING", "IPFS encryption key is not configured");
  }
  return Buffer.from(env.IPFS_ENCRYPTION_KEY, "hex");
}

function encryptDataKey(dataKey, keyEncryptionKey) {
  const wrapIv = crypto.randomBytes(12);
  const wrapCipher = crypto.createCipheriv("aes-256-gcm", keyEncryptionKey, wrapIv);
  const wrapped = Buffer.concat([wrapCipher.update(dataKey), wrapCipher.final()]);
  const wrapTag = wrapCipher.getAuthTag();

  return {
    wrappedDataKey: wrapped.toString("hex"),
    wrapIv: wrapIv.toString("hex"),
    wrapTag: wrapTag.toString("hex"),
    keyWrapAlgorithm: "AES-256-GCM"
  };
}

function unwrapDataKey(metadata, keyEncryptionKey) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    keyEncryptionKey,
    Buffer.from(metadata.wrapIv, "hex")
  );
  decipher.setAuthTag(Buffer.from(metadata.wrapTag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(metadata.wrappedDataKey, "hex")),
    decipher.final()
  ]);
}

function encryptFileBuffer(fileBuffer) {
  const keyEncryptionKey = normalizeEncryptionKey();
  const dataKey = crypto.randomBytes(32);
  const dataIv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", dataKey, dataIv);
  const ciphertext = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  const dataTag = cipher.getAuthTag();
  const wrapped = encryptDataKey(dataKey, keyEncryptionKey);

  return {
    encryptedBuffer: ciphertext,
    encryptionMetadata: {
      keyVersion: KEY_VERSION,
      cipherAlgorithm: "AES-256-GCM",
      dataIv: dataIv.toString("hex"),
      dataTag: dataTag.toString("hex"),
      ...wrapped
    }
  };
}

function decryptFileBuffer(rawBuffer, encryptionMetadata) {
  const keyEncryptionKey = normalizeEncryptionKey();
  const dataKey = unwrapDataKey(encryptionMetadata, keyEncryptionKey);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    dataKey,
    Buffer.from(encryptionMetadata.dataIv, "hex")
  );
  decipher.setAuthTag(Buffer.from(encryptionMetadata.dataTag, "hex"));
  return Buffer.concat([decipher.update(rawBuffer), decipher.final()]);
}

class IpfsService {
  constructor() {
    const backupUrls = env.IPFS_BACKUP_API_URLS.map((url, index) => ({
      name: `backup_${index + 1}`,
      url
    }));

    this.nodes = [
      { name: "primary", url: env.IPFS_PRIMARY_API_URL },
      ...backupUrls
    ].map((node) => ({
      ...node,
      client: create({ url: node.url })
    }));
  }

  deriveHashes(fileBuffer) {
    validateBuffer(fileBuffer);
    const fileChecksum = sha256Hex(fileBuffer);
    return {
      fileChecksum,
      credentialHash: toBytes32(fileChecksum)
    };
  }

  async assertConnectivity() {
    await this._withNodeFallback(
      async (node) =>
        withTimeout(
          node.client.version(),
          env.IPFS_REQUEST_TIMEOUT_MS,
          `IPFS connectivity timed out for ${node.name}`
        ),
      "ipfs_connectivity_check"
    );
    logger.info("IPFS connectivity check passed");
  }

  async uploadFile({
    fileBuffer,
    fileName,
    mimeType,
    encrypt = false,
    expectedCredentialHash,
    expectedFileChecksum
  }) {
    validateBuffer(fileBuffer);

    const { fileChecksum, credentialHash } = this.deriveHashes(fileBuffer);
    if (expectedFileChecksum && expectedFileChecksum.toLowerCase() !== fileChecksum.toLowerCase()) {
      throw new AppError(400, "FILE_CHECKSUM_MISMATCH", "Provided file checksum does not match payload");
    }
    if (expectedCredentialHash && expectedCredentialHash.toLowerCase() !== credentialHash.toLowerCase()) {
      throw new AppError(400, "CREDENTIAL_HASH_MISMATCH", "Provided credential hash does not match payload");
    }

    const encryptedUpload = Boolean(encrypt);
    const { uploadBuffer, encryptionMetadata } = encryptedUpload
      ? (() => {
          const result = encryptFileBuffer(fileBuffer);
          return {
            uploadBuffer: result.encryptedBuffer,
            encryptionMetadata: result.encryptionMetadata
          };
        })()
      : { uploadBuffer: fileBuffer, encryptionMetadata: null };

    const uploadResults = await Promise.allSettled(
      this.nodes.map((node) => this._uploadToNode(node, uploadBuffer))
    );

    const successfulUploads = [];
    const failedUploads = [];

    for (let index = 0; index < uploadResults.length; index += 1) {
      const result = uploadResults[index];
      const nodeName = this.nodes[index].name;
      if (result.status === "fulfilled") {
        successfulUploads.push({ nodeName, cid: result.value });
      } else {
        failedUploads.push({ nodeName, reason: result.reason?.message ?? "unknown" });
      }
    }

    if (successfulUploads.length < env.IPFS_MIN_PIN_REPLICAS) {
      throw new AppError(
        503,
        "IPFS_REDUNDANCY_FAILED",
        "Could not satisfy minimum IPFS pin replicas",
        { successfulUploads, failedUploads }
      );
    }

    const cidSet = new Set(successfulUploads.map((entry) => entry.cid));
    if (cidSet.size !== 1) {
      throw new AppError(
        500,
        "IPFS_CID_DIVERGENCE",
        "Upload produced divergent CIDs across nodes",
        { successfulUploads }
      );
    }

    const cid = normalizeCid(successfulUploads[0].cid);
    await this.pinCID(cid, { bestEffort: true });

    const verification = await this.verifyCID(cid, {
      expectedCredentialHash: credentialHash,
      expectedFileChecksum: fileChecksum,
      encrypted: encryptedUpload,
      encryptionMetadata
    });

    if (!verification.valid) {
      throw new AppError(
        500,
        "IPFS_VERIFY_FAILED",
        "IPFS content-address verification failed",
        verification
      );
    }

    return {
      cid,
      fileName,
      mimeType,
      fileChecksum,
      credentialHash,
      encrypted: encryptedUpload,
      encryptionMetadata,
      pinnedNodes: successfulUploads.map((entry) => entry.nodeName)
    };
  }

  async verifyCID(
    cid,
    {
      expectedCredentialHash,
      expectedFileChecksum,
      encrypted = false,
      encryptionMetadata = null
    } = {}
  ) {
    const normalizedCid = normalizeCid(cid);
    const rawBuffer = await this._fetchRawBuffer(normalizedCid);
    const recomputedCid = await this._computeCid(rawBuffer);
    const cidMatches = recomputedCid === normalizedCid;

    let fileBuffer = rawBuffer;
    if (encrypted) {
      if (!encryptionMetadata) {
        throw new AppError(
          500,
          "ENCRYPTION_METADATA_MISSING",
          "Encrypted CID verification requires encryption metadata"
        );
      }
      fileBuffer = decryptFileBuffer(rawBuffer, encryptionMetadata);
    }

    const fileChecksum = sha256Hex(fileBuffer);
    const credentialHash = toBytes32(fileChecksum);
    const checksumMatches = !expectedFileChecksum ||
      expectedFileChecksum.toLowerCase() === fileChecksum.toLowerCase();
    const hashMatches = !expectedCredentialHash ||
      expectedCredentialHash.toLowerCase() === credentialHash.toLowerCase();
    const valid = cidMatches && checksumMatches && hashMatches;

    return {
      valid,
      cid: normalizedCid,
      recomputedCid,
      cidMatches,
      fileChecksum,
      credentialHash,
      checksumMatches,
      hashMatches
    };
  }

  async fetchFile(cid, { encrypted = false, encryptionMetadata = null } = {}) {
    const normalizedCid = normalizeCid(cid);
    const rawBuffer = await this._fetchRawBuffer(normalizedCid);
    let fileBuffer = rawBuffer;
    if (encrypted) {
      if (!encryptionMetadata) {
        throw new AppError(400, "ENCRYPTION_METADATA_REQUIRED", "Missing encryption metadata");
      }
      fileBuffer = decryptFileBuffer(rawBuffer, encryptionMetadata);
    }

    const fileChecksum = sha256Hex(fileBuffer);
    return {
      cid: normalizedCid,
      rawBuffer,
      fileBuffer,
      fileChecksum,
      credentialHash: toBytes32(fileChecksum)
    };
  }

  async pinCID(cid, { bestEffort = false } = {}) {
    const normalizedCid = normalizeCid(cid);
    const pinResults = await Promise.allSettled(
      this.nodes.map((node) => this._pinOnNode(node, normalizedCid))
    );

    const successfulNodes = pinResults
      .map((result, index) => ({ result, node: this.nodes[index].name }))
      .filter((entry) => entry.result.status === "fulfilled")
      .map((entry) => entry.node);

    if (!bestEffort && successfulNodes.length < env.IPFS_MIN_PIN_REPLICAS) {
      throw new AppError(503, "IPFS_PIN_FAILED", "Failed to pin CID to required replicas", {
        cid: normalizedCid,
        successfulNodes
      });
    }

    let pinataPinned = false;
    if (env.PINATA_JWT) {
      pinataPinned = await this._pinOnPinata(normalizedCid);
    }

    return {
      cid: normalizedCid,
      successfulNodes,
      pinataPinned
    };
  }

  async unpinCID(cid, { bestEffort = true } = {}) {
    const normalizedCid = normalizeCid(cid);
    const results = await Promise.allSettled(
      this.nodes.map((node) => this._unpinOnNode(node, normalizedCid))
    );

    const successfulNodes = results
      .map((result, index) => ({ result, node: this.nodes[index].name }))
      .filter((entry) => entry.result.status === "fulfilled")
      .map((entry) => entry.node);

    if (!bestEffort && successfulNodes.length === 0) {
      throw new AppError(502, "IPFS_UNPIN_FAILED", "Unable to unpin CID from any node", {
        cid: normalizedCid
      });
    }

    if (env.PINATA_JWT) {
      await this._unpinOnPinata(normalizedCid, { bestEffort });
    }

    return {
      cid: normalizedCid,
      successfulNodes
    };
  }

  async _uploadToNode(node, uploadBuffer) {
    return withRetry(
      async () => {
        const addPromise = node.client.add(uploadBuffer, {
          cidVersion: 1,
          hashAlg: "sha2-256",
          rawLeaves: true,
          pin: true
        });

        const result = await withTimeout(
          addPromise,
          env.IPFS_REQUEST_TIMEOUT_MS,
          `Upload timed out for ${node.name}`
        );
        return normalizeCid(result.cid.toString());
      },
      {
        retries: env.IPFS_RETRY_ATTEMPTS,
        delayMs: env.IPFS_RETRY_DELAY_MS,
        onRetry: async (error, attempt, delay) => {
          logger.warn(
            { node: node.name, attempt, delay, error: error.message },
            "Retrying IPFS node upload"
          );
        }
      }
    );
  }

  async _pinOnNode(node, cid) {
    return withRetry(
      async () =>
        withTimeout(
          node.client.pin.add(cid),
          env.IPFS_REQUEST_TIMEOUT_MS,
          `Pin timed out for ${node.name}`
        ),
      {
        retries: env.IPFS_RETRY_ATTEMPTS,
        delayMs: env.IPFS_RETRY_DELAY_MS
      }
    );
  }

  async _unpinOnNode(node, cid) {
    return withRetry(
      async () =>
        withTimeout(
          node.client.pin.rm(cid),
          env.IPFS_REQUEST_TIMEOUT_MS,
          `Unpin timed out for ${node.name}`
        ),
      {
        retries: 1,
        delayMs: env.IPFS_RETRY_DELAY_MS
      }
    );
  }

  async _fetchRawBuffer(cid) {
    const attemptNodeFetch = async (node) =>
      withRetry(
        async () => {
          const stream = await withTimeout(
            Promise.resolve(node.client.cat(cid)),
            env.IPFS_REQUEST_TIMEOUT_MS,
            `Fetch timed out for ${node.name}`
          );
          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
          }
          return Buffer.concat(chunks);
        },
        {
          retries: env.IPFS_RETRY_ATTEMPTS,
          delayMs: env.IPFS_RETRY_DELAY_MS,
          onRetry: async (error, attempt, delay) => {
            logger.warn(
              { node: node.name, attempt, delay, error: error.message },
              "Retrying IPFS fetch"
            );
          }
        }
      );

    try {
      return await this._withNodeFallback(attemptNodeFetch, "ipfs_fetch");
    } catch (nodeError) {
      const gatewayUrl = new URL(cid, env.IPFS_GATEWAY_URL).toString();
      try {
        const response = await withTimeout(
          fetch(gatewayUrl, { method: "GET" }),
          env.IPFS_REQUEST_TIMEOUT_MS,
          "Gateway fetch timed out"
        );
        if (!response.ok) {
          throw new Error(`Gateway returned ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (gatewayError) {
        throw new AppError(
          503,
          "IPFS_FETCH_FAILED",
          "Failed to fetch CID from IPFS nodes and gateway",
          { cid, nodeError: nodeError.message, gatewayError: gatewayError.message }
        );
      }
    }
  }

  async _computeCid(buffer) {
    const primaryNode = this.nodes[0];
    const result = await withRetry(
      async () =>
        withTimeout(
          primaryNode.client.add(buffer, {
            cidVersion: 1,
            hashAlg: "sha2-256",
            rawLeaves: true,
            onlyHash: true,
            pin: false
          }),
          env.IPFS_REQUEST_TIMEOUT_MS,
          "CID recomputation timed out"
        ),
      {
        retries: env.IPFS_RETRY_ATTEMPTS,
        delayMs: env.IPFS_RETRY_DELAY_MS
      }
    );

    return normalizeCid(result.cid.toString());
  }

  async _pinOnPinata(cid) {
    try {
      const response = await withTimeout(
        fetch(`${env.PINATA_API_URL}/pinning/pinByHash`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.PINATA_JWT}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ hashToPin: cid })
        }),
        env.IPFS_REQUEST_TIMEOUT_MS,
        "Pinata pin timed out"
      );

      if (!response.ok) {
        throw new Error(`Pinata pin failed with status ${response.status}`);
      }

      return true;
    } catch (error) {
      logger.warn({ cid, error: error.message }, "Pinata pin failed");
      return false;
    }
  }

  async _unpinOnPinata(cid, { bestEffort }) {
    try {
      const response = await withTimeout(
        fetch(`${env.PINATA_API_URL}/pinning/unpin/${cid}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${env.PINATA_JWT}`
          }
        }),
        env.IPFS_REQUEST_TIMEOUT_MS,
        "Pinata unpin timed out"
      );

      if (!response.ok && !bestEffort) {
        throw new Error(`Pinata unpin failed with status ${response.status}`);
      }
    } catch (error) {
      if (bestEffort) {
        logger.warn({ cid, error: error.message }, "Pinata unpin failed");
        return;
      }
      throw new AppError(502, "PINATA_UNPIN_FAILED", "Unable to unpin CID on Pinata", { cid });
    }
  }

  async _withNodeFallback(operation, label) {
    let lastError;
    for (const node of this.nodes) {
      try {
        return await operation(node);
      } catch (error) {
        lastError = error;
        logger.warn({ node: node.name, label, error: error.message }, "IPFS node attempt failed");
      }
    }
    throw lastError ?? new Error("All IPFS node attempts failed");
  }
}

export const ipfsService = new IpfsService();
