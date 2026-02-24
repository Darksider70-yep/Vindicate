import { ethers } from "ethers";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";

const EVM_READ_ABI = [
  "function getCredentialIdByHash(bytes32 credentialHash) view returns (uint256)",
  "function getCredentialById(uint256 credentialId) view returns ((uint256 credentialId,address student,address issuer,bytes32 credentialHash,uint64 issuedAt,bool revoked))",
  "function verifyCredential(bytes32 credentialHash) view returns (bool)"
];

function assertCredentialHash(credentialHash) {
  if (typeof credentialHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(credentialHash)) {
    throw new AppError(400, "INVALID_HASH", "credentialHash must be a bytes32 hex string");
  }
  return credentialHash.toLowerCase();
}

function parseInteropChainConfig(raw) {
  if (!raw) {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError(500, "INTEROP_CONFIG_INVALID", "INTEROP_CHAIN_CONFIG_JSON must be valid JSON array");
  }

  if (!Array.isArray(parsed)) {
    throw new AppError(500, "INTEROP_CONFIG_INVALID", "INTEROP_CHAIN_CONFIG_JSON must be a JSON array");
  }

  return parsed;
}

class EvmChainAdapter {
  constructor({ chainId, network, rpcUrl, contractAddress }) {
    this.type = "evm";
    this.chainId = Number(chainId);
    this.network = network;
    this.rpcUrl = rpcUrl;
    this.contractAddress = contractAddress;

    this.provider = new ethers.JsonRpcProvider(this.rpcUrl, this.chainId);
    this.contract = new ethers.Contract(this.contractAddress, EVM_READ_ABI, this.provider);
  }

  async resolveCredentialAnchor(credentialHash) {
    try {
      const credentialId = await this.contract.getCredentialIdByHash(credentialHash);
      if (credentialId === 0n) {
        return {
          chainType: this.type,
          chainId: this.chainId,
          network: this.network,
          anchored: false,
          active: false
        };
      }

      const [active, credential] = await Promise.all([
        this.contract.verifyCredential(credentialHash),
        this.contract.getCredentialById(credentialId)
      ]);

      return {
        chainType: this.type,
        chainId: this.chainId,
        network: this.network,
        anchored: true,
        active: Boolean(active) && !credential.revoked,
        credentialId: credentialId.toString(),
        issuer: credential.issuer.toLowerCase(),
        student: credential.student.toLowerCase(),
        issuedAt: Number(credential.issuedAt),
        revoked: Boolean(credential.revoked)
      };
    } catch (error) {
      return {
        chainType: this.type,
        chainId: this.chainId,
        network: this.network,
        anchored: false,
        active: false,
        error: error.message
      };
    }
  }
}

class SolanaChainAdapter {
  constructor({ network, lookupUrl, timeoutMs = 12000 }) {
    this.type = "solana";
    this.network = network;
    this.lookupUrl = lookupUrl;
    this.timeoutMs = timeoutMs;
  }

  async resolveCredentialAnchor(credentialHash) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const requestUrl = new URL(this.lookupUrl);
      requestUrl.searchParams.set("credentialHash", credentialHash);
      requestUrl.searchParams.set("network", this.network);

      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Solana lookup failed with status ${response.status}`);
      }

      const payload = await response.json();
      const anchored = Boolean(payload?.anchored);
      const active = anchored && !payload?.revoked;

      return {
        chainType: this.type,
        chainId: this.network,
        network: this.network,
        anchored,
        active,
        slot: payload?.slot ?? null,
        signature: payload?.signature ?? null,
        programId: payload?.programId ?? null,
        revoked: Boolean(payload?.revoked)
      };
    } catch (error) {
      return {
        chainType: this.type,
        chainId: this.network,
        network: this.network,
        anchored: false,
        active: false,
        error: error.name === "AbortError" ? "Solana lookup timed out" : error.message
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

class ChainAgnosticAnchoringService {
  constructor() {
    this.adapters = this._buildAdapters();
  }

  _buildAdapters() {
    const adapters = [];

    adapters.push(
      new EvmChainAdapter({
        chainId: env.CHAIN_ID,
        network: `eip155:${env.CHAIN_ID}`,
        rpcUrl: env.RPC_URLS[0],
        contractAddress: env.CONTRACT_ADDRESS
      })
    );

    for (const [chainId, contractAddress] of Object.entries(env.MULTICHAIN_CONTRACT_ADDRESSES)) {
      const rpcUrl = env.MULTICHAIN_RPC_URLS[chainId];
      if (!rpcUrl) {
        continue;
      }

      adapters.push(
        new EvmChainAdapter({
          chainId,
          network: `eip155:${chainId}`,
          rpcUrl,
          contractAddress
        })
      );
    }

    for (const chainConfig of parseInteropChainConfig(env.INTEROP_CHAIN_CONFIG_JSON)) {
      const type = String(chainConfig?.type ?? "").toLowerCase();
      if (type === "evm") {
        if (!chainConfig.chainId || !chainConfig.rpcUrl || !chainConfig.contractAddress) {
          continue;
        }
        adapters.push(
          new EvmChainAdapter({
            chainId: chainConfig.chainId,
            network: chainConfig.network ?? `eip155:${chainConfig.chainId}`,
            rpcUrl: chainConfig.rpcUrl,
            contractAddress: chainConfig.contractAddress
          })
        );
      }

      if (type === "solana") {
        if (!chainConfig.network || !chainConfig.lookupUrl) {
          continue;
        }
        adapters.push(
          new SolanaChainAdapter({
            network: chainConfig.network,
            lookupUrl: chainConfig.lookupUrl,
            timeoutMs: Number(chainConfig.timeoutMs ?? 12000)
          })
        );
      }
    }

    if (env.SOLANA_ANCHOR_LOOKUP_URL) {
      adapters.push(
        new SolanaChainAdapter({
          network: env.SOLANA_NETWORK,
          lookupUrl: env.SOLANA_ANCHOR_LOOKUP_URL,
          timeoutMs: env.SOLANA_LOOKUP_TIMEOUT_MS
        })
      );
    }

    return adapters;
  }

  getSupportedChains() {
    return this.adapters.map((adapter) => ({
      chainType: adapter.type,
      chainId: adapter.chainId,
      network: adapter.network
    }));
  }

  async resolveCredentialAnchors(credentialHash) {
    const normalizedHash = assertCredentialHash(credentialHash);

    const anchors = await Promise.all(
      this.adapters.map((adapter) => adapter.resolveCredentialAnchor(normalizedHash))
    );

    const anchoredCount = anchors.filter((entry) => entry.anchored).length;
    const activeCount = anchors.filter((entry) => entry.active).length;

    return {
      credentialHash: normalizedHash,
      anchoredCount,
      activeCount,
      anchors
    };
  }
}

export const chainAgnosticAnchoringService = new ChainAgnosticAnchoringService();
