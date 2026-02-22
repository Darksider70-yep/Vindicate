import fs from "node:fs";
import { ethers } from "ethers";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../utils/app-error.js";
import { withRetry } from "../../utils/retry.js";
import { ProviderManager } from "./provider-manager.js";

const contractJsonPath = new URL("../../../contracts/SkillProof.json", import.meta.url);
const contractJson = JSON.parse(fs.readFileSync(contractJsonPath, "utf8"));
const contractAbi = Array.isArray(contractJson) ? contractJson : contractJson.abi;

if (!Array.isArray(contractAbi)) {
  throw new Error("Invalid contract ABI format in backend/contracts/SkillProof.json");
}

function parseBytes32Hash(credentialHash) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(credentialHash)) {
    throw new AppError(400, "INVALID_HASH", "credentialHash must be a bytes32 hex string");
  }
  return credentialHash.toLowerCase();
}

function parseStudentAddress(address) {
  if (!ethers.isAddress(address)) {
    throw new AppError(400, "INVALID_ADDRESS", "Invalid student wallet address");
  }
  return ethers.getAddress(address);
}

class BlockchainService {
  constructor() {
    this.providerManager = new ProviderManager({
      rpcUrls: env.RPC_URLS,
      chainId: env.CHAIN_ID,
      logger
    });
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
        const contract = new ethers.Contract(env.CONTRACT_ADDRESS, contractAbi, provider);
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
        const contract = new ethers.Contract(env.CONTRACT_ADDRESS, contractAbi, provider);
        const credentialId = await contract.getCredentialIdByHash(hash);
        if (credentialId === 0n) {
          return null;
        }

        const credential = await contract.getCredentialById(credentialId);
        return {
          credentialId: Number(credential.credentialId),
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
    const student = parseStudentAddress(studentAddress);
    const hash = parseBytes32Hash(credentialHash);

    try {
      return await withRetry(
        async () =>
          this.providerManager.execute(async (provider) => {
            const signer = new ethers.Wallet(env.BACKEND_PRIVATE_KEY, provider);
            const contract = new ethers.Contract(env.CONTRACT_ADDRESS, contractAbi, signer);
            const tx = await contract.issueCredential(student, hash);
            const receipt = await tx.wait(env.TX_CONFIRMATIONS, env.TX_TIMEOUT_MS);

            if (!receipt || receipt.status !== 1) {
              throw new Error("Transaction reverted before confirmation");
            }

            let issuedEvent;
            for (const log of receipt.logs) {
              try {
                const parsed = contract.interface.parseLog(log);
                if (parsed?.name === "CredentialIssued") {
                  issuedEvent = parsed;
                  break;
                }
              } catch (_error) {
                continue;
              }
            }

            const eventCredentialId =
              issuedEvent?.args?.credentialId ?? (await contract.getCredentialIdByHash(hash));
            const eventIssuedAt =
              issuedEvent?.args?.issuedAt ?? Math.floor(Date.now() / 1000);

            return {
              txHash: tx.hash,
              credentialId: Number(eventCredentialId),
              issuedAt: new Date(Number(eventIssuedAt) * 1000),
              blockNumber: Number(receipt.blockNumber)
            };
          }, {
            timeoutMs: env.BLOCKCHAIN_CALL_TIMEOUT_MS + env.TX_TIMEOUT_MS,
            label: "issue_credential"
          }),
        {
          retries: env.BLOCKCHAIN_TX_RETRIES,
          delayMs: env.BLOCKCHAIN_TX_RETRY_DELAY_MS,
          onRetry: async (error, attempt, delay) => {
            logger.warn(
              { attempt, delay, error: error.message },
              "Retrying blockchain credential issuance"
            );
          }
        }
      );
    } catch (error) {
      throw new AppError(
        502,
        "BLOCKCHAIN_WRITE_FAILED",
        "Failed to issue credential on blockchain",
        undefined,
        error
      );
    }
  }

  async revokeCredential(credentialId) {
    if (!Number.isInteger(credentialId) || credentialId <= 0) {
      throw new AppError(400, "INVALID_CREDENTIAL_ID", "credentialId must be a positive integer");
    }

    try {
      return await withRetry(
        async () =>
          this.providerManager.execute(async (provider) => {
            const signer = new ethers.Wallet(env.BACKEND_PRIVATE_KEY, provider);
            const contract = new ethers.Contract(env.CONTRACT_ADDRESS, contractAbi, signer);
            const tx = await contract.revokeCredential(credentialId);
            const receipt = await tx.wait(env.TX_CONFIRMATIONS, env.TX_TIMEOUT_MS);

            if (!receipt || receipt.status !== 1) {
              throw new Error("Revoke transaction reverted before confirmation");
            }

            return {
              txHash: tx.hash,
              blockNumber: Number(receipt.blockNumber)
            };
          }, {
            timeoutMs: env.BLOCKCHAIN_CALL_TIMEOUT_MS + env.TX_TIMEOUT_MS,
            label: "revoke_credential"
          }),
        {
          retries: env.BLOCKCHAIN_TX_RETRIES,
          delayMs: env.BLOCKCHAIN_TX_RETRY_DELAY_MS,
          onRetry: async (error, attempt, delay) => {
            logger.warn(
              { attempt, delay, error: error.message },
              "Retrying blockchain credential revocation"
            );
          }
        }
      );
    } catch (error) {
      throw new AppError(
        502,
        "BLOCKCHAIN_WRITE_FAILED",
        "Failed to revoke credential on blockchain",
        undefined,
        error
      );
    }
  }
}

export const blockchainService = new BlockchainService();
