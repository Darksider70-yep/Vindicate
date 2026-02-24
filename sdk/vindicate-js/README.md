# @vindicate/protocol-sdk

Public JavaScript SDK for integrating with the Vindicate Credential Protocol.

## Installation

```bash
npm install @vindicate/protocol-sdk
```

## Quick start

```js
import {
  VindicateProtocolClient,
  verifyCredentialHash,
  resolveDid,
  verifyZkProof
} from "@vindicate/protocol-sdk";

const client = new VindicateProtocolClient({
  baseUrl: "https://api.vindicate.example.com",
  apiKey: process.env.VINDICATE_API_KEY
});

const verification = await verifyCredentialHash(
  client,
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
);

const did = await resolveDid(client, "did:ethr:1:0x1234567890abcdef1234567890abcdef12345678");

const zkResult = await verifyZkProof(client, {
  challengeId: "challenge-id",
  proof: { a: [], b: [], c: [] },
  publicSignals: []
});
```

## Exports

- Core client: `VindicateProtocolClient`
- Verification helpers: credential/VC verification and QR helpers
- DID helpers: register/resolve/ownership verification
- ZK helpers: challenge and proof flows
- Interop helpers: chain descriptors and anchor query builders