# Interoperability Design

## Supported network families

- Ethereum-compatible networks (EVM):
  - Ethereum Mainnet (`eip155:1`)
  - Polygon PoS (`eip155:137`)
  - Additional EVM chains via `INTEROP_CHAIN_CONFIG_JSON`
- Solana (conceptual abstraction through lookup adapter):
  - Network key examples: `solana:mainnet-beta`, `solana:devnet`

## Multi-chain anchoring abstraction

Backend implementation:

- `backend/src/services/interoperability/chain-anchoring.service.js`

Adapter types:

- `EvmChainAdapter`: reads on-chain anchor status from SkillProof-compatible contracts
- `SolanaChainAdapter`: queries configured lookup endpoint for Solana anchor attestations

## Example interoperability config

```json
[
  {
    "type": "evm",
    "chainId": 1,
    "network": "eip155:1",
    "rpcUrl": "https://mainnet.infura.io/v3/<key>",
    "contractAddress": "0x1111111111111111111111111111111111111111"
  },
  {
    "type": "evm",
    "chainId": 137,
    "network": "eip155:137",
    "rpcUrl": "https://polygon-rpc.com",
    "contractAddress": "0x2222222222222222222222222222222222222222"
  },
  {
    "type": "solana",
    "network": "solana:mainnet-beta",
    "lookupUrl": "https://solana-anchor.vindicate.example/lookup",
    "timeoutMs": 12000
  }
]
```

## Chain-agnostic verification behavior

- Anchor queries return per-chain status (`anchored`, `active`, `revoked`, metadata).
- Protocol verification passes if at least one trusted anchor path is active.
- Cross-chain anchor modules can be activated/deactivated by governance through protocol registry.