const CHAIN_EXPLORERS = {
  1: "https://etherscan.io/tx/",
  10: "https://optimistic.etherscan.io/tx/",
  56: "https://bscscan.com/tx/",
  137: "https://polygonscan.com/tx/",
  42161: "https://arbiscan.io/tx/",
  8453: "https://basescan.org/tx/",
  11155111: "https://sepolia.etherscan.io/tx/",
  31337: ""
};

export function getExplorerTxLink(txHash) {
  if (!txHash) {
    return null;
  }

  const customBase = import.meta.env.VITE_EXPLORER_TX_BASE;
  if (customBase) {
    return `${customBase.replace(/\/+$/, "")}/${txHash}`;
  }

  const chainId = Number(import.meta.env.VITE_CHAIN_ID || 31337);
  const chainBase = CHAIN_EXPLORERS[chainId];
  if (!chainBase) {
    return null;
  }

  return `${chainBase}${txHash}`;
}