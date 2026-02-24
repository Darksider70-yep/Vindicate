export const CHAIN_FAMILIES = Object.freeze({
  EVM: "evm",
  SOLANA: "solana"
});

export function normalizeChainDescriptor(chainDescriptor) {
  if (!chainDescriptor || typeof chainDescriptor !== "object") {
    throw new Error("chainDescriptor must be an object");
  }

  const chainType = String(chainDescriptor.chainType || chainDescriptor.type || "").toLowerCase();
  const chainId = String(chainDescriptor.chainId || chainDescriptor.network || "").trim();

  if (!chainType || !chainId) {
    throw new Error("chainDescriptor must include chainType and chainId");
  }

  return {
    chainType,
    chainId,
    network: String(chainDescriptor.network || chainId)
  };
}

export function isEvmChain(chainDescriptor) {
  const normalized = normalizeChainDescriptor(chainDescriptor);
  return normalized.chainType === CHAIN_FAMILIES.EVM;
}

export function isSolanaChain(chainDescriptor) {
  const normalized = normalizeChainDescriptor(chainDescriptor);
  return normalized.chainType === CHAIN_FAMILIES.SOLANA;
}

export function createAnchorQuery({ credentialHash, chains = [] }) {
  if (typeof credentialHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(credentialHash)) {
    throw new Error("credentialHash must be a bytes32 hex string");
  }

  return {
    credentialHash: credentialHash.toLowerCase(),
    chains: chains.map(normalizeChainDescriptor)
  };
}