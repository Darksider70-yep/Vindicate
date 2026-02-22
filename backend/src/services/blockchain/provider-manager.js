import { ethers } from "ethers";
import { withTimeout } from "../../utils/retry.js";

export class ProviderManager {
  constructor({ rpcUrls, chainId, logger }) {
    this.logger = logger;
    this.providers = rpcUrls.map(
      (rpcUrl) => new ethers.JsonRpcProvider(rpcUrl, chainId, { staticNetwork: chainId })
    );
    this.activeIndex = 0;
  }

  getProvider(index) {
    return this.providers[index];
  }

  getTraversalOrder() {
    const order = [];
    for (let i = 0; i < this.providers.length; i += 1) {
      order.push((this.activeIndex + i) % this.providers.length);
    }
    return order;
  }

  async execute(operation, { timeoutMs, label }) {
    let lastError;

    for (const providerIndex of this.getTraversalOrder()) {
      const provider = this.providers[providerIndex];
      try {
        const result = await withTimeout(
          operation(provider, providerIndex),
          timeoutMs,
          `${label} timed out`
        );
        this.activeIndex = providerIndex;
        return result;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          {
            providerIndex,
            label,
            error: error.message
          },
          "RPC provider attempt failed"
        );
      }
    }

    throw lastError;
  }
}
