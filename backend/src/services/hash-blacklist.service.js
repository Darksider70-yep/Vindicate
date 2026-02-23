import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

const staticBlacklistedHashes = new Set(env.HASH_BLACKLIST.map((hash) => hash.toLowerCase()));

function assertBytes32(hash) {
  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    throw new AppError(400, "INVALID_HASH", "Hash must be bytes32 hex");
  }
}

function normalizeHash(hash) {
  assertBytes32(hash);
  return hash.toLowerCase();
}

export async function isHashBlacklisted(hash) {
  const normalizedHash = normalizeHash(hash);
  if (staticBlacklistedHashes.has(normalizedHash)) {
    return true;
  }

  const dbEntry = await prisma.hashBlacklist.findUnique({
    where: { credentialHash: normalizedHash }
  });
  return Boolean(dbEntry);
}

export async function assertHashNotBlacklisted(hash) {
  if (await isHashBlacklisted(hash)) {
    throw new AppError(403, "HASH_BLACKLISTED", "Credential hash is blacklisted");
  }
}

export async function blacklistHash(credentialHash, reason, actorUserId) {
  const normalizedHash = normalizeHash(credentialHash);
  return prisma.hashBlacklist.upsert({
    where: { credentialHash: normalizedHash },
    create: {
      credentialHash: normalizedHash,
      reason,
      actorUserId
    },
    update: {
      reason,
      actorUserId
    }
  });
}
