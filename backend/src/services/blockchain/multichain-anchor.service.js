import { ethers } from "ethers";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";

const MULTICHAIN_READ_ABI = [
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

function normalizeChainConfig(chainId, rpcUrl, contractAddress) {
  if (!/^[0-9]+$/.test(String(chainId))) {
    throw new AppError(500, "CHAIN_CONFIG_INVALID", "Chain id must be numeric");
  }
  if (!rpcUrl || typeof rpcUrl !== "string") {
    throw new AppError(500, "CHAIN_CONFIG_INVALID", `Missing RPC URL for chain ${chainId}`);
  }
  if (!ethers.isAddress(contractAddress)) {
    throw new AppError(500, "CHAIN_CONFIG_INVALID", `Invalid contract address for chain ${chainId}`);
  }

  return {
    chainId: Number(chainId),
    rpcUrl,
    contractAddress: ethers.getAddress(contractAddress)
  };
}

function toChainMap() {
  const chainMap = new Map();

  chainMap.set(
    String(env.CHAIN_ID),
    normalizeChainConfig(env.CHAIN_ID, env.RPC_URLS[0], env.CONTRACT_ADDRESS)
  );

  for (const [chainId, contractAddress] of Object.entries(env.MULTICHAIN_CONTRACT_ADDRESSES)) {
    const rpcUrl = env.MULTICHAIN_RPC_URLS[chainId];
    if (!rpcUrl) {
      continue;
    }
    chainMap.set(chainId, normalizeChainConfig(chainId, rpcUrl, contractAddress));
  }

  return Array.from(chainMap.values());
}

class MultichainAnchorService {
  constructor() {
    this.providerCache = new Map();
  }

  getProvider(chainConfig) {
    const key = String(chainConfig.chainId);
    if (this.providerCache.has(key)) {
      return this.providerCache.get(key);
    }

    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl, chainConfig.chainId);
    this.providerCache.set(key, provider);
    return provider;
  }

  async queryChain(chainConfig, credentialHash) {
    const provider = this.getProvider(chainConfig);
    const contract = new ethers.Contract(
      chainConfig.contractAddress,
      MULTICHAIN_READ_ABI,
      provider
    );

    try {
      const credentialId = await contract.getCredentialIdByHash(credentialHash);
      if (credentialId === 0n) {
        return {
          chainId: chainConfig.chainId,
          anchored: false,
          active: false
        };
      }

      const [isActive, credential] = await Promise.all([
        contract.verifyCredential(credentialHash),
        contract.getCredentialById(credentialId)
      ]);

      return {
        chainId: chainConfig.chainId,
        anchored: true,
        active: Boolean(isActive) && !credential.revoked,
        credentialId: credentialId.toString(),
        issuer: credential.issuer.toLowerCase(),
        student: credential.student.toLowerCase(),
        issuedAt: Number(credential.issuedAt),
        revoked: Boolean(credential.revoked)
      };
    } catch (error) {
      return {
        chainId: chainConfig.chainId,
        anchored: false,
        active: false,
        error: error.message
      };
    }
  }

  async resolveCredentialAnchors(credentialHash) {
    const hash = assertCredentialHash(credentialHash);
    const chains = toChainMap();
    const anchorResults = await Promise.all(chains.map((chain) => this.queryChain(chain, hash)));

    const anchoredCount = anchorResults.filter((result) => result.anchored).length;
    const activeCount = anchorResults.filter((result) => result.active).length;

    return {
      credentialHash: hash,
      anchoredCount,
      activeCount,
      anchors: anchorResults
    };
  }
}

export const multichainAnchorService = new MultichainAnchorService();
