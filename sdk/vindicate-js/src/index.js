export { VindicateProtocolClient } from "./client.js";

export {
  verifyCredentialHash,
  fetchCredentialQr,
  verifyVerifiableCredential,
  resolveCredentialAnchors,
  isCredentialIntegrityPassed
} from "./verification.js";

export {
  resolveDid,
  verifyDidOwnership,
  registerStudentDid,
  registerInstitutionDid
} from "./did.js";

export {
  createZkChallenge,
  verifyZkProof,
  getZkChallenge,
  buildDisclosurePayload
} from "./zk.js";

export {
  CHAIN_FAMILIES,
  normalizeChainDescriptor,
  isEvmChain,
  isSolanaChain,
  createAnchorQuery
} from "./interoperability.js";