import fs from "node:fs";
import { ethers } from "ethers";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../utils/app-error.js";
import { withRetry } from "../../utils/retry.js";
import { ProviderManager } from "./provider-manager.js";

const contractJsonPath = new URL("../../../contracts/SkillProof.json", import.meta.url);
const contractJson = JSON.parse(fs.readFileSync(contractJsonPath, "utf8"));
const baseAbi = Array.isArray(contractJson) ? contractJson : contractJson.abi;

if (!Array.isArray(baseAbi)) {
  throw new Error("Invalid contract ABI format in backend/contracts/SkillProof.json");
}

const governanceFragments = [
  "function approveIssuer(address issuer)",
  "function removeIssuer(address issuer)",
  "function grantRole(bytes32 role, address account)",
  "function revokeRole(bytes32 role, address account)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function isIssuer(address account) view returns (bool)",
  "function isInstitutionAdmin(address account) view returns (bool)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function INSTITUTION_ADMIN_ROLE() view returns (bytes32)",
  "function ISSUER_ROLE() view returns (bytes32)",
  "event IssuerApproved(address indexed issuer, address indexed approvedBy)",
  "event IssuerRemoved(address indexed issuer, address indexed removedBy)"
];

const contractAbi = [...baseAbi, ...governanceFragments];

const ROLE_NAMES = Object.freeze({
  DEFAULT_ADMIN_ROLE: "DEFAULT_ADMIN_ROLE",
  INSTITUTION_ADMIN_ROLE: "INSTITUTION_ADMIN_ROLE",
  ISSUER_ROLE: "ISSUER_ROLE"
});

function parseBytes32Hash(credentialHash) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(credentialHash)) {
    throw new AppError(400, "INVALID_HASH", "credentialHash must be a bytes32 hex string");
  }
  return credentialHash.toLowerCase();
}

function parseAddress(address, label = "wallet") {
  if (!ethers.isAddress(address)) {
    throw new AppError(400, "INVALID_ADDRESS", `Invalid ${label} address`);
  }
  return ethers.getAddress(address);
}

function parseCredentialId(credentialId) {
  if (typeof credentialId === "bigint") {
    return credentialId;
  }
  if (typeof credentialId === "number" && Number.isInteger(credentialId) && credentialId > 0) {
    return BigInt(credentialId);
  }
  if (typeof credentialId === "string" && /^[0-9]+$/.test(credentialId)) {
    return BigInt(credentialId);
  }
  throw new AppError(400, "INVALID_CREDENTIAL_ID", "credentialId must be a positive integer");
}

class BlockchainService {
  constructor() {
    this.providerManager = new ProviderManager({
      rpcUrls: env.RPC_URLS,
      chainId: env.CHAIN_ID,
      logger
    });
    this.roleCache = {};
  }

  getReadContract(provider) {
    return new ethers.Contract(env.CONTRACT_ADDRESS, contractAbi, provider);
  }

  getWriteContract(provider) {
    const signer = new ethers.Wallet(env.BACKEND_PRIVATE_KEY, provider);
    return new ethers.Contract(env.CONTRACT_ADDRESS, contractAbi, signer);
  }

  async _executeWrite(label, action, retryMessage) {
    try {
      return await withRetry(
        async () =>
          this.providerManager.execute(async (provider) => {
            const contract = this.getWriteContract(provider);
            const tx = await action(contract);
            const receipt = await tx.wait(env.TX_CONFIRMATIONS, env.TX_TIMEOUT_MS);

            if (!receipt || receipt.status !== 1) {
              throw new Error("Transaction reverted before confirmation");
            }

            return {
              txHash: tx.hash,
              blockNumber: Number(receipt.blockNumber),
              receipt,
              contract
            };
          }, {
            timeoutMs: env.BLOCKCHAIN_CALL_TIMEOUT_MS + env.TX_TIMEOUT_MS,
            label
          }),
        {
          retries: env.BLOCKCHAIN_TX_RETRIES,
          delayMs: env.BLOCKCHAIN_TX_RETRY_DELAY_MS,
          onRetry: async (error, attempt, delay) => {
            logger.warn(
              { attempt, delay, error: error.message, label },
              retryMessage
            );
          }
        }
      );
    } catch (error) {
      throw new AppError(502, "BLOCKCHAIN_WRITE_FAILED", "Failed blockchain transaction", undefined, error);
    }
  }

  async _getRoleId(roleName) {
    if (this.roleCache[roleName]) {
      return this.roleCache[roleName];
    }

    const fallback =
      roleName === ROLE_NAMES.DEFAULT_ADMIN_ROLE ? ethers.ZeroHash : ethers.id(roleName);

    try {
      const roleId = await this.providerManager.execute(async (provider) => {
        const contract = this.getReadContract(provider);
        const getter = contract[roleName];
        if (typeof getter !== "function") {
          return fallback;
        }
        return getter();
      }, {
        timeoutMs: env.BLOCKCHAIN_CALL_TIMEOUT_MS,
        label: `get_${roleName.toLowerCase()}`
      });

      this.roleCache[roleName] = roleId;
      return roleId;
    } catch {
      this.roleCache[roleName] = fallback;
      return fallback;
    }
  }

  async assertConnectivity() {
    await this.providerManager.execute((provider) => provider.getBlockNumber(), {
      timeoutMs: env.BLOCKCHAIN_CALL_TIMEOUT_MS,
      label: "blockchain_connectivity_check"
    });
    logger.info("Blockchain connectivity check passed");
  }

  async verifyCredential(credentialHash) {
    const hash = parseBytes32Hash(credentialHash);

    try {
      return await this.providerManager.execute(async (provider) => {
        const contract = this.getReadContract(provider);
        const isValid = await contract.verifyCredential(hash);
        return Boolean(isValid);
      }, {
        timeoutMs: env.BLOCKCHAIN_CALL_TIMEOUT_MS,
        label: "verify_credential"
      });
    } catch (error) {
      throw new AppError(
        502,
        "BLOCKCHAIN_READ_FAILED",
        "Failed to verify credential on-chain",
        undefined,
        error
      );
    }
  }

  async getCredentialByHash(credentialHash) {
    const hash = parseBytes32Hash(credentialHash);

    try {
      return await this.providerManager.execute(async (provider) => {
        const contract = this.getReadContract(provider);
        const credentialId = await contract.getCredentialIdByHash(hash);
        if (credentialId === 0n) {
          return null;
        }

        const credential = await contract.getCredentialById(credentialId);
        return {
          credentialId: credential.credentialId.toString(),
          credentialHash: credential.credentialHash.toLowerCase(),
          student: credential.student.toLowerCase(),
          issuer: credential.issuer.toLowerCase(),
          issuedAt: Number(credential.issuedAt),
          revoked: credential.revoked
        };
      }, {
        timeoutMs: env.BLOCKCHAIN_CALL_TIMEOUT_MS,
        label: "get_credential_by_hash"
      });
    } catch (error) {
      throw new AppError(
        502,
        "BLOCKCHAIN_READ_FAILED",
        "Failed to fetch credential from blockchain",
        undefined,
        error
      );
    }
  }

  async issueCredential(studentAddress, credentialHash) {
    const student = parseAddress(studentAddress, "student");
    const hash = parseBytes32Hash(credentialHash);

    const writeResult = await this._executeWrite(
      "issue_credential",
      (contract) => contract.issueCredential(student, hash),
      "Retrying blockchain credential issuance"
    );

    let issuedEvent;
    for (const log of writeResult.receipt.logs) {
      try {
        const parsed = writeResult.contract.interface.parseLog(log);
        if (parsed?.name === "CredentialIssued") {
          issuedEvent = parsed;
          break;
        }
      } catch {
        continue;
      }
    }

    const eventCredentialId =
      issuedEvent?.args?.credentialId ??
      (await this.providerManager.execute(async (provider) => {
        const contract = this.getReadContract(provider);
        return contract.getCredentialIdByHash(hash);
      }, {
        timeoutMs: env.BLOCKCHAIN_CALL_TIMEOUT_MS,
        label: "issue_lookup_credential_id"
      }));
    const eventIssuedAt =
      issuedEvent?.args?.issuedAt ?? Math.floor(Date.now() / 1000);

    return {
      txHash: writeResult.txHash,
      credentialId: eventCredentialId.toString(),
      issuedAt: new Date(Number(eventIssuedAt) * 1000),
      blockNumber: writeResult.blockNumber
    };
  }

  async revokeCredential(credentialId) {
    const normalizedCredentialId = parseCredentialId(credentialId);
    const writeResult = await this._executeWrite(
      "revoke_credential",
      (contract) => contract.revokeCredential(normalizedCredentialId),
      "Retrying blockchain credential revocation"
    );

    return {
      txHash: writeResult.txHash,
      blockNumber: writeResult.blockNumber
    };
  }

  async approveIssuer(issuerAddress) {
    const issuer = parseAddress(issuerAddress, "issuer");
    const writeResult = await this._executeWrite(
      "approve_issuer",
      (contract) => contract.approveIssuer(issuer),
      "Retrying issuer approval on-chain"
    );
    return {
      txHash: writeResult.txHash,
      blockNumber: writeResult.blockNumber
    };
  }

  async removeIssuer(issuerAddress) {
    const issuer = parseAddress(issuerAddress, "issuer");
    const writeResult = await this._executeWrite(
      "remove_issuer",
      (contract) => contract.removeIssuer(issuer),
      "Retrying issuer removal on-chain"
    );
    return {
      txHash: writeResult.txHash,
      blockNumber: writeResult.blockNumber
    };
  }

  async grantInstitutionAdmin(accountAddress) {
    const account = parseAddress(accountAddress, "institution admin");
    const roleId = await this._getRoleId(ROLE_NAMES.INSTITUTION_ADMIN_ROLE);
    const writeResult = await this._executeWrite(
      "grant_institution_admin_role",
      (contract) => contract.grantRole(roleId, account),
      "Retrying institution-admin role grant on-chain"
    );

    return {
      txHash: writeResult.txHash,
      blockNumber: writeResult.blockNumber
    };
  }

  async revokeInstitutionAdmin(accountAddress) {
    const account = parseAddress(accountAddress, "institution admin");
    const roleId = await this._getRoleId(ROLE_NAMES.INSTITUTION_ADMIN_ROLE);
    const writeResult = await this._executeWrite(
      "revoke_institution_admin_role",
      (contract) => contract.revokeRole(roleId, account),
      "Retrying institution-admin role revoke on-chain"
    );

    return {
      txHash: writeResult.txHash,
      blockNumber: writeResult.blockNumber
    };
  }

  async grantSuperAdmin(accountAddress) {
    const account = parseAddress(accountAddress, "super admin");
    const roleId = await this._getRoleId(ROLE_NAMES.DEFAULT_ADMIN_ROLE);
    const writeResult = await this._executeWrite(
      "grant_super_admin_role",
      (contract) => contract.grantRole(roleId, account),
      "Retrying super-admin role grant on-chain"
    );

    return {
      txHash: writeResult.txHash,
      blockNumber: writeResult.blockNumber
    };
  }

  async revokeSuperAdmin(accountAddress) {
    const account = parseAddress(accountAddress, "super admin");
    const roleId = await this._getRoleId(ROLE_NAMES.DEFAULT_ADMIN_ROLE);
    const writeResult = await this._executeWrite(
      "revoke_super_admin_role",
      (contract) => contract.revokeRole(roleId, account),
      "Retrying super-admin role revoke on-chain"
    );

    return {
      txHash: writeResult.txHash,
      blockNumber: writeResult.blockNumber
    };
  }

  async isIssuer(accountAddress) {
    const account = parseAddress(accountAddress, "issuer");
    try {
      return await this.providerManager.execute(async (provider) => {
        const contract = this.getReadContract(provider);
        if (typeof contract.isIssuer === "function") {
          return Boolean(await contract.isIssuer(account));
        }
        const roleId = await this._getRoleId(ROLE_NAMES.ISSUER_ROLE);
        return Boolean(await contract.hasRole(roleId, account));
      }, {
        timeoutMs: env.BLOCKCHAIN_CALL_TIMEOUT_MS,
        label: "is_issuer"
      });
    } catch (error) {
      throw new AppError(
        502,
        "BLOCKCHAIN_READ_FAILED",
        "Failed to verify issuer role on-chain",
        undefined,
        error
      );
    }
  }

  async isInstitutionAdmin(accountAddress) {
    const account = parseAddress(accountAddress, "institution admin");
    try {
      return await this.providerManager.execute(async (provider) => {
        const contract = this.getReadContract(provider);
        if (typeof contract.isInstitutionAdmin === "function") {
          return Boolean(await contract.isInstitutionAdmin(account));
        }
        const roleId = await this._getRoleId(ROLE_NAMES.INSTITUTION_ADMIN_ROLE);
        return Boolean(await contract.hasRole(roleId, account));
      }, {
        timeoutMs: env.BLOCKCHAIN_CALL_TIMEOUT_MS,
        label: "is_institution_admin"
      });
    } catch (error) {
      throw new AppError(
        502,
        "BLOCKCHAIN_READ_FAILED",
        "Failed to verify institution-admin role on-chain",
        undefined,
        error
      );
    }
  }
}

export const blockchainService = new BlockchainService();
