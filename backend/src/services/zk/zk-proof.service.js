import crypto from "node:crypto";
import fs from "node:fs/promises";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import { toBytes32Hash } from "../../utils/canonical-json.js";
import { hashAttributeLeaf, verifyMerkleProof } from "../../utils/merkle.js";
import { parseEthrDid } from "../did/did.service.js";

function normalizeHash(value, label = "hash") {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new AppError(400, "INVALID_HASH", `${label} must be a bytes32 hex string`);
  }
  return value.toLowerCase();
}

function assertPublicSignals(publicSignals) {
  if (!Array.isArray(publicSignals) || publicSignals.length === 0) {
    throw new AppError(400, "INVALID_PUBLIC_SIGNALS", "publicSignals must be a non-empty array");
  }
}

function assertProofObject(proof) {
  if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
    throw new AppError(400, "INVALID_ZK_PROOF", "proof must be an object");
  }
}

function challengeExpired(challenge) {
  return challenge.expiresAt.getTime() <= Date.now();
}

async function markChallengeExpiredIfNeeded(challengeId, challenge) {
  if (!challengeExpired(challenge)) {
    return;
  }
  if (challenge.status !== "EXPIRED") {
    await prisma.zkProofChallenge.update({
      where: { id: challengeId },
      data: { status: "EXPIRED" }
    });
  }
}

let cachedVerificationKey = null;
async function getVerificationKey() {
  if (cachedVerificationKey) {
    return cachedVerificationKey;
  }
  if (!env.ZK_VERIFICATION_KEY_PATH) {
    throw new AppError(500, "ZK_CONFIG_INVALID", "ZK_VERIFICATION_KEY_PATH is required for groth16 mode");
  }
  const raw = await fs.readFile(env.ZK_VERIFICATION_KEY_PATH, "utf8");
  cachedVerificationKey = JSON.parse(raw);
  return cachedVerificationKey;
}

async function verifyGroth16Proof({ proof, publicSignals }) {
  const verificationKey = await getVerificationKey();
  const snark = await import("snarkjs");
  return snark.groth16.verify(verificationKey, publicSignals, proof);
}

function verifyMockProof({ challenge, proof, publicSignals, disclosedAttribute }) {
  const challengeSignal = String(publicSignals[env.ZK_PUBLIC_SIGNAL_INDEX_CHALLENGE]).toLowerCase();
  if (challengeSignal !== challenge.challengeHash.toLowerCase()) {
    return false;
  }

  const proofChallengeHash = proof.challengeHash
    ? normalizeHash(String(proof.challengeHash), "proof.challengeHash")
    : null;
  if (proofChallengeHash && proofChallengeHash !== challenge.challengeHash.toLowerCase()) {
    return false;
  }

  const merkleRoot = normalizeHash(proof.merkleRoot, "proof.merkleRoot");
  const leafHash = normalizeHash(proof.leafHash, "proof.leafHash");
  if (merkleRoot !== challenge.vc.merkleRoot.toLowerCase()) {
    return false;
  }

  if (disclosedAttribute) {
    const expectedLeaf = hashAttributeLeaf(disclosedAttribute.key, disclosedAttribute.value);
    if (expectedLeaf !== leafHash) {
      return false;
    }
  }

  return verifyMerkleProof({
    leafHash,
    siblings: proof.siblings,
    root: merkleRoot
  });
}

async function verifyByMode({ challenge, proof, publicSignals, disclosedAttribute }) {
  if (env.ZK_PROOF_MODE === "groth16") {
    return verifyGroth16Proof({ proof, publicSignals });
  }

  return verifyMockProof({
    challenge,
    proof,
    publicSignals,
    disclosedAttribute
  });
}

export async function createZkChallenge({
  vcHash,
  verifierDid
}) {
  const normalizedVcHash = normalizeHash(vcHash, "vcHash");
  const normalizedVerifierDid = parseEthrDid(verifierDid).did;
  const vcRecord = await prisma.verifiableCredential.findUnique({
    where: { vcHash: normalizedVcHash }
  });
  if (!vcRecord) {
    throw new AppError(404, "VC_NOT_FOUND", "Verifiable credential not found");
  }
  if (vcRecord.status !== "ACTIVE") {
    throw new AppError(409, "VC_INACTIVE", "Cannot create ZK challenge for inactive VC");
  }
  if (vcRecord.expiresAt && vcRecord.expiresAt.getTime() <= Date.now()) {
    throw new AppError(409, "VC_EXPIRED", "Cannot create ZK challenge for expired VC");
  }

  const challengeRaw = cryptoRandomHex(32);
  const challengeHash = toBytes32Hash(challengeRaw).toLowerCase();
  const expiresAt = new Date(Date.now() + env.ZK_CHALLENGE_TTL_SECONDS * 1000);

  const challengeRecord = await prisma.zkProofChallenge.create({
    data: {
      vcId: vcRecord.id,
      challenge: challengeRaw,
      challengeHash,
      verifierDid: normalizedVerifierDid,
      subjectDid: vcRecord.subjectDid,
      status: "PENDING",
      expiresAt
    }
  });

  return {
    id: challengeRecord.id,
    challenge: challengeRaw,
    challengeHash,
    vcHash: vcRecord.vcHash,
    expiresAt: expiresAt.toISOString()
  };
}

function cryptoRandomHex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

export async function verifyZkProofSubmission({
  challengeId,
  nullifierHash,
  proof,
  publicSignals,
  verificationMethod,
  disclosedAttribute
}) {
  assertProofObject(proof);
  assertPublicSignals(publicSignals);
  const normalizedNullifierHash = normalizeHash(nullifierHash, "nullifierHash");

  const challenge = await prisma.zkProofChallenge.findUnique({
    where: { id: challengeId },
    include: {
      vc: true
    }
  });
  if (!challenge) {
    throw new AppError(404, "ZK_CHALLENGE_NOT_FOUND", "ZK challenge not found");
  }

  await markChallengeExpiredIfNeeded(challenge.id, challenge);
  if (challenge.status !== "PENDING" || challengeExpired(challenge)) {
    throw new AppError(409, "ZK_CHALLENGE_INVALID", "Challenge is expired or already consumed");
  }
  if (
    challenge.vc.status !== "ACTIVE" ||
    (challenge.vc.expiresAt && challenge.vc.expiresAt.getTime() <= Date.now())
  ) {
    throw new AppError(409, "VC_INACTIVE", "Cannot verify proof against inactive credential");
  }

  const existingNullifier = await prisma.zkProofSubmission.findUnique({
    where: { nullifierHash: normalizedNullifierHash }
  });
  if (existingNullifier) {
    throw new AppError(409, "ZK_NULLIFIER_REPLAY", "Nullifier has already been used");
  }

  let verified = false;
  try {
    verified = await verifyByMode({
      challenge,
      proof,
      publicSignals,
      disclosedAttribute
    });
  } catch (error) {
    throw new AppError(400, "ZK_PROOF_INVALID", "Proof verification failed", undefined, error);
  }

  const now = new Date();
  const submission = await prisma.zkProofSubmission.create({
    data: {
      challengeId: challenge.id,
      nullifierHash: normalizedNullifierHash,
      proof,
      publicSignals,
      verificationMethod: verificationMethod ?? env.ZK_PROOF_MODE,
      verified,
      verifiedAt: verified ? now : null,
      expiresAt: challenge.expiresAt
    }
  });

  if (verified) {
    await prisma.zkProofChallenge.update({
      where: { id: challenge.id },
      data: {
        status: "CONSUMED",
        consumedAt: now
      }
    });
  }

  return {
    challengeId: challenge.id,
    vcHash: challenge.vc.vcHash,
    verified,
    submissionId: submission.id
  };
}

export async function getZkChallengeStatus({ challengeId }) {
  const challenge = await prisma.zkProofChallenge.findUnique({
    where: { id: challengeId },
    include: {
      submissions: {
        orderBy: {
          createdAt: "desc"
        },
        take: 5
      }
    }
  });
  if (!challenge) {
    throw new AppError(404, "ZK_CHALLENGE_NOT_FOUND", "ZK challenge not found");
  }

  await markChallengeExpiredIfNeeded(challenge.id, challenge);

  return {
    id: challenge.id,
    vcId: challenge.vcId,
    status: challengeExpired(challenge) ? "EXPIRED" : challenge.status,
    expiresAt: challenge.expiresAt.toISOString(),
    consumedAt: challenge.consumedAt?.toISOString() ?? null,
    submissions: challenge.submissions.map((entry) => ({
      id: entry.id,
      verified: entry.verified,
      createdAt: entry.createdAt.toISOString()
    }))
  };
}
