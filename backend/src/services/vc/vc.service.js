import crypto from "node:crypto";
import { ethers } from "ethers";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { ROLES } from "../../constants/roles.js";
import { AppError } from "../../utils/app-error.js";
import { stableStringify, toBytes32Hash } from "../../utils/canonical-json.js";
import {
  buildCredentialMerkleTree,
  createMerkleProof,
  hashAttributeLeaf,
  verifyMerkleProof
} from "../../utils/merkle.js";
import { getOrCreateDidForUser, parseEthrDid } from "../did/did.service.js";
import { multichainAnchorService } from "../blockchain/multichain-anchor.service.js";

function normalizeHash(value, label = "hash") {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new AppError(400, "INVALID_HASH", `${label} must be a bytes32 hex string`);
  }
  return value.toLowerCase();
}

function normalizeDid(value, label = "did") {
  try {
    return parseEthrDid(value).did;
  } catch (error) {
    throw new AppError(400, "INVALID_DID", `Invalid ${label}`, undefined, error);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeContexts(contexts) {
  const entries = Array.isArray(contexts) && contexts.length > 0 ? contexts : env.VC_DEFAULT_CONTEXTS;
  return Array.from(new Set(entries.map((entry) => String(entry).trim()).filter(Boolean)));
}

function normalizeTypes(types) {
  const entries = Array.isArray(types) && types.length > 0 ? types : env.VC_DEFAULT_TYPES;
  return Array.from(new Set(entries.map((entry) => String(entry).trim()).filter(Boolean)));
}

function normalizeExpiration(expirationDate) {
  if (!expirationDate) {
    return null;
  }
  const date = new Date(expirationDate);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, "INVALID_EXPIRATION", "expirationDate must be a valid ISO date");
  }
  return date;
}

function getIssuerPrivateKey(issuerDid) {
  const exact = env.VC_ISSUER_PRIVATE_KEYS[issuerDid];
  if (exact) {
    return exact;
  }

  const lowerDid = issuerDid.toLowerCase();
  for (const [didKey, privateKey] of Object.entries(env.VC_ISSUER_PRIVATE_KEYS)) {
    if (didKey.toLowerCase() === lowerDid) {
      return privateKey;
    }
  }

  return null;
}

function getSignerForIssuerDid(issuerDid) {
  const parsed = parseEthrDid(issuerDid);
  const configuredPrivateKey = getIssuerPrivateKey(parsed.did);
  if (configuredPrivateKey) {
    const signer = new ethers.Wallet(configuredPrivateKey);
    if (signer.address.toLowerCase() !== parsed.controllerAddress) {
      throw new AppError(
        500,
        "VC_ISSUER_KEY_MISMATCH",
        "Configured VC issuer key does not match DID controller address"
      );
    }
    return signer;
  }

  const backendSigner = new ethers.Wallet(env.BACKEND_PRIVATE_KEY);
  if (backendSigner.address.toLowerCase() === parsed.controllerAddress) {
    return backendSigner;
  }

  throw new AppError(
    500,
    "VC_ISSUER_KEY_MISSING",
    "No issuer signing key configured for issuer DID"
  );
}

function buildUnsignedVc({
  contexts,
  types,
  issuerDid,
  subjectDid,
  issuanceDate,
  expirationDate,
  credentialHash,
  credentialSubject,
  merkleRoot
}) {
  return {
    "@context": contexts,
    type: types,
    issuer: issuerDid,
    issuanceDate,
    expirationDate: expirationDate ?? undefined,
    credentialSubject: {
      id: subjectDid,
      credentialHash,
      ...credentialSubject
    },
    credentialStatus: {
      id: `urn:vindicate:credential-hash:${credentialHash}`,
      type: "VindicateCredentialStatus2026"
    },
    evidence: [
      {
        type: "VindicateMerkleCommitment2026",
        merkleRoot
      }
    ]
  };
}

async function signVc(unsignedVc, issuerDid) {
  const signer = getSignerForIssuerDid(issuerDid);
  const serialized = stableStringify(unsignedVc);
  const signature = await signer.signMessage(serialized);
  const created = new Date().toISOString();

  return {
    ...unsignedVc,
    proof: {
      type: "EcdsaSecp256k1RecoverySignature2020",
      created,
      proofPurpose: "assertionMethod",
      verificationMethod: `${issuerDid}#controller`,
      jws: signature
    }
  };
}

function assertVcIssuePermission(authUser, credential) {
  if (authUser.role === ROLES.SUPER_ADMIN) {
    return;
  }

  if (
    authUser.role === ROLES.INSTITUTION_ADMIN &&
    authUser.institutionId &&
    authUser.institutionId === credential.institutionId
  ) {
    return;
  }

  if (authUser.role === ROLES.VERIFIED_ISSUER && authUser.sub === credential.issuerId) {
    return;
  }

  throw new AppError(403, "FORBIDDEN", "Not authorized to issue verifiable credential");
}

function assertVcReadPermission(authUser, vcRecord) {
  if (
    authUser.role === ROLES.SUPER_ADMIN ||
    authUser.role === ROLES.VERIFIER ||
    authUser.sub === vcRecord.subjectUserId ||
    authUser.sub === vcRecord.issuerUserId ||
    (authUser.role === ROLES.INSTITUTION_ADMIN &&
      authUser.institutionId &&
      authUser.institutionId === vcRecord.institutionId)
  ) {
    return;
  }
  throw new AppError(403, "FORBIDDEN", "Not authorized to access this verifiable credential");
}

function stripProof(vcDocument) {
  const unsigned = { ...vcDocument };
  delete unsigned.proof;
  return unsigned;
}

function computeHmacSignature(payload) {
  return crypto
    .createHmac("sha256", env.QR_SIGNING_SECRET)
    .update(stableStringify(payload))
    .digest("hex");
}

function ensureActiveVc(vcRecord) {
  if (vcRecord.status !== "ACTIVE") {
    throw new AppError(409, "VC_INACTIVE", "Verifiable credential is inactive");
  }
  if (vcRecord.expiresAt && vcRecord.expiresAt.getTime() <= Date.now()) {
    throw new AppError(409, "VC_EXPIRED", "Verifiable credential has expired");
  }
}

function getSubjectAttributeMap(vcDocument) {
  if (!isPlainObject(vcDocument?.credentialSubject)) {
    throw new AppError(500, "VC_INVALID", "VC credentialSubject is invalid");
  }
  const attributes = { ...vcDocument.credentialSubject };
  delete attributes.id;
  return attributes;
}

function parseOfflineToken(token) {
  if (!token || typeof token !== "string") {
    throw new AppError(400, "INVALID_TOKEN", "Offline token is required");
  }

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (!parsed || !isPlainObject(parsed.payload) || typeof parsed.signature !== "string") {
      throw new Error("shape");
    }
    return parsed;
  } catch (error) {
    throw new AppError(400, "INVALID_TOKEN", "Offline token is malformed", undefined, error);
  }
}

export async function issueVerifiableCredential({
  authUser,
  credentialHash,
  credentialSubject,
  subjectDid,
  contexts,
  types,
  expirationDate
}) {
  if (!isPlainObject(credentialSubject)) {
    throw new AppError(400, "INVALID_CREDENTIAL_SUBJECT", "credentialSubject must be a JSON object");
  }

  const normalizedCredentialHash = normalizeHash(credentialHash, "credentialHash");
  const credential = await prisma.credential.findUnique({
    where: { credentialHash: normalizedCredentialHash },
    include: {
      institution: true,
      student: true,
      issuer: true
    }
  });

  if (!credential) {
    throw new AppError(404, "CREDENTIAL_NOT_FOUND", "Base credential not found");
  }
  if (credential.status === "REVOKED") {
    throw new AppError(409, "CREDENTIAL_REVOKED", "Cannot issue VC for revoked credential");
  }
  assertVcIssuePermission(authUser, credential);

  const issuerUser = await prisma.user.findUnique({
    where: { id: authUser.sub }
  });
  if (!issuerUser) {
    throw new AppError(401, "AUTH_USER_NOT_FOUND", "Authenticated user not found");
  }

  const issuerDidIdentity = await getOrCreateDidForUser({
    userId: issuerUser.id,
    walletAddress: issuerUser.walletAddress,
    createdByUserId: authUser.sub
  });

  let subjectDidIdentity;
  if (subjectDid) {
    const normalizedSubjectDid = normalizeDid(subjectDid, "subjectDid");
    subjectDidIdentity = await prisma.didIdentity.findUnique({
      where: { did: normalizedSubjectDid }
    });
    if (!subjectDidIdentity || subjectDidIdentity.userId !== credential.studentId || !subjectDidIdentity.isActive) {
      throw new AppError(
        409,
        "SUBJECT_DID_NOT_BOUND",
        "Subject DID must be active and bound to credential student"
      );
    }
  } else {
    subjectDidIdentity = await getOrCreateDidForUser({
      userId: credential.studentId,
      walletAddress: credential.student.walletAddress,
      createdByUserId: authUser.sub
    });
  }

  const normalizedContexts = normalizeContexts(contexts);
  const normalizedTypes = normalizeTypes(types);
  const normalizedExpiration = normalizeExpiration(expirationDate);

  const subjectAttributesRaw = { ...credentialSubject };
  delete subjectAttributesRaw.credentialHash;
  const merkleInput = {
    credentialHash: normalizedCredentialHash,
    ...subjectAttributesRaw
  };
  const merkleTree = buildCredentialMerkleTree(merkleInput);

  const issuanceDateIso = new Date().toISOString();
  const unsignedVc = buildUnsignedVc({
    contexts: normalizedContexts,
    types: normalizedTypes,
    issuerDid: issuerDidIdentity.did,
    subjectDid: subjectDidIdentity.did,
    issuanceDate: issuanceDateIso,
    expirationDate: normalizedExpiration ? normalizedExpiration.toISOString() : null,
    credentialHash: normalizedCredentialHash,
    credentialSubject: subjectAttributesRaw,
    merkleRoot: merkleTree.root
  });

  const signedVc = await signVc(unsignedVc, issuerDidIdentity.did);
  const vcHash = toBytes32Hash(stableStringify(signedVc)).toLowerCase();
  const duplicate = await prisma.verifiableCredential.findUnique({
    where: { vcHash }
  });
  if (duplicate) {
    throw new AppError(409, "VC_DUPLICATE", "Verifiable credential already exists");
  }

  const chainAnchors = await multichainAnchorService.resolveCredentialAnchors(normalizedCredentialHash);

  const vcRecord = await prisma.verifiableCredential.create({
    data: {
      credentialDbId: credential.id,
      issuerUserId: issuerUser.id,
      subjectUserId: credential.studentId,
      institutionId: credential.institutionId,
      issuerDid: issuerDidIdentity.did,
      subjectDid: subjectDidIdentity.did,
      issuerDidIdentityId: issuerDidIdentity.id,
      subjectDidIdentityId: subjectDidIdentity.id,
      vcHash,
      credentialHash: normalizedCredentialHash,
      merkleRoot: merkleTree.root,
      merkleLeaves: {
        orderedKeys: merkleTree.orderedKeys,
        leavesByKey: merkleTree.leavesByKey
      },
      vcDocument: signedVc,
      proofType: signedVc.proof.type,
      proofSignature: signedVc.proof.jws,
      proofCreatedAt: new Date(signedVc.proof.created),
      chainAnchors,
      status: "ACTIVE",
      expiresAt: normalizedExpiration
    }
  });

  return {
    vc: vcRecord,
    chainAnchors
  };
}

export async function getVerifiableCredentialByHash({ authUser, vcHash }) {
  const normalizedVcHash = normalizeHash(vcHash, "vcHash");
  const vcRecord = await prisma.verifiableCredential.findUnique({
    where: { vcHash: normalizedVcHash },
    include: {
      issuerUser: true,
      subjectUser: true,
      institution: true,
      credential: true
    }
  });
  if (!vcRecord) {
    throw new AppError(404, "VC_NOT_FOUND", "Verifiable credential not found");
  }

  assertVcReadPermission(authUser, vcRecord);
  return vcRecord;
}

export async function verifyVerifiableCredential({ vcHash, requireChainAnchor = true }) {
  const normalizedVcHash = normalizeHash(vcHash, "vcHash");
  const vcRecord = await prisma.verifiableCredential.findUnique({
    where: { vcHash: normalizedVcHash }
  });
  if (!vcRecord) {
    throw new AppError(404, "VC_NOT_FOUND", "Verifiable credential not found");
  }

  const checks = [];
  let valid = true;

  const computedVcHash = toBytes32Hash(stableStringify(vcRecord.vcDocument)).toLowerCase();
  const hashMatch = computedVcHash === vcRecord.vcHash.toLowerCase();
  checks.push({
    check: "vc_hash_match",
    passed: hashMatch
  });
  valid = valid && hashMatch;

  const unsignedVc = stripProof(vcRecord.vcDocument);
  const proof = vcRecord.vcDocument?.proof;
  const parsedIssuerDid = parseEthrDid(vcRecord.issuerDid);
  let recoveredIssuer = null;
  let issuerSignatureValid = false;
  try {
    recoveredIssuer = ethers.verifyMessage(stableStringify(unsignedVc), proof?.jws).toLowerCase();
    issuerSignatureValid = recoveredIssuer === parsedIssuerDid.controllerAddress;
  } catch {
    issuerSignatureValid = false;
  }
  checks.push({
    check: "issuer_signature_valid",
    passed: issuerSignatureValid,
    recoveredAddress: recoveredIssuer
  });
  valid = valid && issuerSignatureValid;

  const subjectAttributes = getSubjectAttributeMap(vcRecord.vcDocument);
  const rebuiltMerkleTree = buildCredentialMerkleTree(subjectAttributes);
  const merkleRootValid = rebuiltMerkleTree.root.toLowerCase() === vcRecord.merkleRoot.toLowerCase();
  checks.push({
    check: "merkle_root_match",
    passed: merkleRootValid
  });
  valid = valid && merkleRootValid;

  const statusValid =
    vcRecord.status === "ACTIVE" &&
    (!vcRecord.expiresAt || vcRecord.expiresAt.getTime() > Date.now());
  checks.push({
    check: "status_active",
    passed: statusValid
  });
  valid = valid && statusValid;

  let chainAnchors = vcRecord.chainAnchors;
  if (requireChainAnchor) {
    chainAnchors = await multichainAnchorService.resolveCredentialAnchors(vcRecord.credentialHash);
    const chainValid = chainAnchors.activeCount > 0;
    checks.push({
      check: "chain_anchor_active",
      passed: chainValid,
      activeCount: chainAnchors.activeCount
    });
    valid = valid && chainValid;
  }

  return {
    valid,
    vcHash: vcRecord.vcHash,
    checks,
    chainAnchors
  };
}

export async function generateSelectiveDisclosureProof({
  authUser,
  vcId,
  attributeKey,
  challenge
}) {
  const vcRecord = await prisma.verifiableCredential.findUnique({
    where: { id: vcId }
  });
  if (!vcRecord) {
    throw new AppError(404, "VC_NOT_FOUND", "Verifiable credential not found");
  }

  assertVcReadPermission(authUser, vcRecord);
  ensureActiveVc(vcRecord);

  const subjectAttributes = getSubjectAttributeMap(vcRecord.vcDocument);
  const merkleTree = buildCredentialMerkleTree(subjectAttributes);
  if (merkleTree.root.toLowerCase() !== vcRecord.merkleRoot.toLowerCase()) {
    throw new AppError(409, "VC_INTEGRITY_FAILED", "Merkle root mismatch for VC");
  }

  const proof = createMerkleProof(merkleTree, attributeKey);
  const attributeValue = subjectAttributes[attributeKey];
  const now = Date.now();
  const expiresAt = new Date(now + env.VC_PROOF_MAX_AGE_SECONDS * 1000).toISOString();
  const challengeHash = challenge ? toBytes32Hash(challenge).toLowerCase() : null;

  const payload = {
    vcHash: vcRecord.vcHash,
    subjectDid: vcRecord.subjectDid,
    issuerDid: vcRecord.issuerDid,
    attributeKey,
    attributeValue,
    leafHash: proof.leafHash,
    siblings: proof.siblings,
    merkleRoot: proof.root,
    challengeHash,
    generatedAt: new Date(now).toISOString(),
    expiresAt
  };

  return {
    proof: payload,
    proofSignature: computeHmacSignature(payload)
  };
}

export async function verifySelectiveDisclosureProof({
  proof,
  proofSignature,
  challenge
}) {
  if (!proof || !isPlainObject(proof)) {
    throw new AppError(400, "INVALID_PROOF", "proof payload is required");
  }
  if (!proofSignature || typeof proofSignature !== "string") {
    throw new AppError(400, "INVALID_PROOF", "proof signature is required");
  }

  const expectedSignature = computeHmacSignature(proof);
  if (expectedSignature !== proofSignature) {
    return {
      valid: false,
      reason: "proof_signature_invalid"
    };
  }

  const expiresAt = new Date(proof.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return {
      valid: false,
      reason: "proof_expired"
    };
  }

  if (proof.challengeHash && challenge) {
    const challengeHash = toBytes32Hash(challenge).toLowerCase();
    if (challengeHash !== String(proof.challengeHash).toLowerCase()) {
      return {
        valid: false,
        reason: "challenge_mismatch"
      };
    }
  }

  const vcVerification = await verifyVerifiableCredential({
    vcHash: proof.vcHash,
    requireChainAnchor: false
  });
  if (!vcVerification.valid) {
    return {
      valid: false,
      reason: "vc_invalid",
      vcChecks: vcVerification.checks
    };
  }

  const leafHash = hashAttributeLeaf(proof.attributeKey, proof.attributeValue);
  const merkleValid = verifyMerkleProof({
    leafHash,
    siblings: proof.siblings,
    root: proof.merkleRoot
  });

  if (!merkleValid) {
    return {
      valid: false,
      reason: "merkle_proof_invalid"
    };
  }

  return {
    valid: true
  };
}

function assertOfflineTokenPermission(authUser, vcRecord) {
  if (
    authUser.role === ROLES.SUPER_ADMIN ||
    authUser.sub === vcRecord.subjectUserId ||
    authUser.sub === vcRecord.issuerUserId ||
    (authUser.role === ROLES.INSTITUTION_ADMIN &&
      authUser.institutionId &&
      authUser.institutionId === vcRecord.institutionId)
  ) {
    return;
  }

  throw new AppError(403, "FORBIDDEN", "Not authorized to create offline QR token");
}

export async function createOfflineQrToken({
  authUser,
  vcId,
  verifierChallenge
}) {
  const vcRecord = await prisma.verifiableCredential.findUnique({
    where: { id: vcId }
  });
  if (!vcRecord) {
    throw new AppError(404, "VC_NOT_FOUND", "Verifiable credential not found");
  }

  ensureActiveVc(vcRecord);
  assertOfflineTokenPermission(authUser, vcRecord);

  const issuerSigner = getSignerForIssuerDid(vcRecord.issuerDid);
  const nonce = crypto.randomBytes(16).toString("hex");
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + env.VC_OFFLINE_QR_TTL_SECONDS * 1000);
  const verifierChallengeHash = verifierChallenge
    ? toBytes32Hash(verifierChallenge).toLowerCase()
    : null;

  const payload = {
    vcHash: vcRecord.vcHash,
    credentialHash: vcRecord.credentialHash,
    issuerDid: vcRecord.issuerDid,
    nonce,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    verifierChallengeHash
  };

  const signature = await issuerSigner.signMessage(stableStringify(payload));
  const encodedToken = Buffer.from(
    stableStringify({
      payload,
      signature
    }),
    "utf8"
  ).toString("base64url");
  const tokenHash = toBytes32Hash(encodedToken).toLowerCase();

  await prisma.offlineQrToken.create({
    data: {
      vcId: vcRecord.id,
      tokenNonce: nonce,
      tokenHash,
      verifierChallengeHash,
      issuerSignature: signature,
      status: "ISSUED",
      issuedAt,
      expiresAt
    }
  });

  const verificationUrl = `${env.PUBLIC_VERIFY_BASE_URL.replace(/\/+$/, "")}/verify/offline?token=${encodeURIComponent(encodedToken)}`;

  return {
    token: encodedToken,
    verificationUrl,
    expiresAt: expiresAt.toISOString()
  };
}

export async function verifyOfflineQrToken({ token, verifierChallenge }) {
  const parsedToken = parseOfflineToken(token);
  const tokenHash = toBytes32Hash(token).toLowerCase();
  const tokenRecord = await prisma.offlineQrToken.findUnique({
    where: { tokenHash },
    include: {
      vc: true
    }
  });

  if (!tokenRecord) {
    return {
      valid: false,
      reason: "token_not_found"
    };
  }

  if (tokenRecord.status !== "ISSUED") {
    return {
      valid: false,
      reason: "token_replayed_or_invalidated"
    };
  }

  if (tokenRecord.expiresAt.getTime() <= Date.now()) {
    await prisma.offlineQrToken.update({
      where: { id: tokenRecord.id },
      data: { status: "EXPIRED" }
    });
    return {
      valid: false,
      reason: "token_expired"
    };
  }

  if (tokenRecord.verifierChallengeHash) {
    if (!verifierChallenge) {
      return {
        valid: false,
        reason: "challenge_required"
      };
    }
    const providedChallengeHash = toBytes32Hash(verifierChallenge).toLowerCase();
    if (providedChallengeHash !== tokenRecord.verifierChallengeHash.toLowerCase()) {
      return {
        valid: false,
        reason: "challenge_mismatch"
      };
    }
  }

  const issuerControllerAddress = parseEthrDid(tokenRecord.vc.issuerDid).controllerAddress;
  let recoveredAddress;
  try {
    recoveredAddress = ethers
      .verifyMessage(stableStringify(parsedToken.payload), parsedToken.signature)
      .toLowerCase();
  } catch {
    return {
      valid: false,
      reason: "signature_invalid"
    };
  }

  if (recoveredAddress !== issuerControllerAddress) {
    return {
      valid: false,
      reason: "issuer_signature_invalid"
    };
  }

  if (tokenRecord.vc.status !== "ACTIVE") {
    return {
      valid: false,
      reason: "vc_not_active"
    };
  }

  if (tokenRecord.vc.expiresAt && tokenRecord.vc.expiresAt.getTime() <= Date.now()) {
    return {
      valid: false,
      reason: "vc_expired"
    };
  }

  await prisma.offlineQrToken.update({
    where: { id: tokenRecord.id },
    data: {
      status: "CONSUMED",
      consumedAt: new Date()
    }
  });

  return {
    valid: true,
    vcHash: tokenRecord.vc.vcHash,
    credentialHash: tokenRecord.vc.credentialHash
  };
}

export async function revokeVerifiableCredential({
  authUser,
  vcHash
}) {
  const normalizedVcHash = normalizeHash(vcHash, "vcHash");
  const vcRecord = await prisma.verifiableCredential.findUnique({
    where: { vcHash: normalizedVcHash }
  });
  if (!vcRecord) {
    throw new AppError(404, "VC_NOT_FOUND", "Verifiable credential not found");
  }
  if (vcRecord.status === "REVOKED") {
    throw new AppError(409, "VC_ALREADY_REVOKED", "Verifiable credential already revoked");
  }

  const canRevoke =
    authUser.role === ROLES.SUPER_ADMIN ||
    authUser.sub === vcRecord.issuerUserId ||
    (authUser.role === ROLES.INSTITUTION_ADMIN &&
      authUser.institutionId &&
      authUser.institutionId === vcRecord.institutionId);

  if (!canRevoke) {
    throw new AppError(403, "FORBIDDEN", "Not authorized to revoke verifiable credential");
  }

  return prisma.verifiableCredential.update({
    where: { id: vcRecord.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date()
    }
  });
}
