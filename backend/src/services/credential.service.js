import { ethers } from "ethers";
import { prisma } from "../db/prisma.js";
import { ROLES } from "../constants/roles.js";
import { blockchainService } from "./blockchain/blockchain.service.js";
import { ipfsService } from "./ipfs.service.js";
import { AppError } from "../utils/app-error.js";
import {
  assertHashNotBlacklisted,
  blacklistHash
} from "./hash-blacklist.service.js";
import { evaluateCredentialIntegrity } from "./integrity.service.js";
import { generateVerificationQrCode } from "./qr.service.js";

function normalizeAddress(address) {
  if (!ethers.isAddress(address)) {
    throw new AppError(400, "INVALID_ADDRESS", "Invalid wallet address");
  }
  return ethers.getAddress(address).toLowerCase();
}

function parseBase64File(fileBase64) {
  try {
    const normalized = fileBase64.replace(/^data:.*;base64,/, "");
    const buffer = Buffer.from(normalized, "base64");
    if (buffer.length === 0) {
      throw new Error("empty");
    }
    return buffer;
  } catch (error) {
    throw new AppError(400, "INVALID_FILE", "Could not parse base64 file payload", undefined, error);
  }
}

async function assertIssuanceAllowed(authUser, institutionId) {
  if (authUser.role === ROLES.SUPER_ADMIN) {
    return;
  }

  if (authUser.role === ROLES.INSTITUTION_ADMIN) {
    if (!authUser.institutionId || authUser.institutionId !== institutionId) {
      throw new AppError(403, "FORBIDDEN", "Institution admins can only issue for their institution");
    }
    return;
  }

  if (authUser.role === ROLES.VERIFIED_ISSUER) {
    const issuerRecord = await prisma.issuer.findFirst({
      where: {
        userId: authUser.sub,
        institutionId,
        status: "ACTIVE",
        approved: true
      }
    });

    if (!issuerRecord) {
      throw new AppError(403, "FORBIDDEN", "Issuer is not approved for this institution");
    }
    return;
  }

  throw new AppError(403, "FORBIDDEN", "Insufficient role for credential issuance");
}

export async function issueCredential({
  authUser,
  studentAddress,
  institutionId,
  fileName,
  mimeType,
  fileBase64,
  metadata = {},
  encrypt = false
}) {
  const issuerUserId = authUser.sub;
  const normalizedStudentAddress = normalizeAddress(studentAddress);
  const fileBuffer = parseBase64File(fileBase64);
  const derivedHashes = ipfsService.deriveHashes(fileBuffer);

  const [issuerUser, institution] = await Promise.all([
    prisma.user.findUnique({ where: { id: issuerUserId } }),
    prisma.institution.findUnique({ where: { id: institutionId } })
  ]);

  if (!issuerUser) {
    throw new AppError(401, "AUTH_USER_NOT_FOUND", "Authenticated user not found");
  }
  if (!institution) {
    throw new AppError(404, "INSTITUTION_NOT_FOUND", "Institution not found");
  }

  await assertIssuanceAllowed(authUser, institutionId);
  await assertHashNotBlacklisted(derivedHashes.credentialHash);

  const duplicateCredential = await prisma.credential.findFirst({
    where: {
      OR: [
        { credentialHash: derivedHashes.credentialHash },
        { fileChecksum: derivedHashes.fileChecksum }
      ]
    }
  });
  if (duplicateCredential) {
    throw new AppError(409, "DUPLICATE_CREDENTIAL", "Duplicate credential document detected");
  }

  const existingOnChain = await blockchainService.getCredentialByHash(derivedHashes.credentialHash);
  if (existingOnChain) {
    throw new AppError(409, "DUPLICATE_CREDENTIAL", "Credential hash already exists on-chain");
  }

  let uploadResult;
  let chainResult;

  uploadResult = await ipfsService.uploadFile({
    fileBuffer,
    fileName,
    mimeType,
    encrypt,
    expectedCredentialHash: derivedHashes.credentialHash,
    expectedFileChecksum: derivedHashes.fileChecksum
  });

  try {
    chainResult = await blockchainService.issueCredential(
      normalizedStudentAddress,
      uploadResult.credentialHash
    );
  } catch (error) {
    await ipfsService.unpinCID(uploadResult.cid, { bestEffort: true });
    throw new AppError(
      502,
      "ISSUANCE_BLOCKCHAIN_FAILED",
      "Blockchain commit failed after IPFS upload; CID unpinned",
      { cid: uploadResult.cid },
      error
    );
  }
  const studentUser = await prisma.user.upsert({
    where: { walletAddress: normalizedStudentAddress },
    create: {
      walletAddress: normalizedStudentAddress,
      role: ROLES.STUDENT,
      institutionId
    },
    update: {
      institutionId
    }
  });

  let credentialRecord;
  try {
    credentialRecord = await prisma.$transaction(async (tx) => {
      const createdCredential = await tx.credential.create({
        data: {
          credentialId: BigInt(chainResult.credentialId),
          studentId: studentUser.id,
          issuerId: issuerUser.id,
          institutionId,
          studentAddress: normalizedStudentAddress,
          issuerAddress: issuerUser.walletAddress,
          credentialHash: uploadResult.credentialHash,
          ipfsCid: uploadResult.cid,
          fileChecksum: uploadResult.fileChecksum,
          fileName: fileName,
          mimeType: mimeType,
          metadata: metadata,
          encrypted: uploadResult.encrypted,
          status: "ACTIVE",
          txHash: chainResult.txHash,
          issuedAt: chainResult.issuedAt
        }
      });

      if (uploadResult.encrypted && uploadResult.encryptionMetadata) {
        await tx.credentialKey.create({
          data: {
            credentialId: createdCredential.id,
            keyVersion: uploadResult.encryptionMetadata.keyVersion,
            cipherAlgorithm: uploadResult.encryptionMetadata.cipherAlgorithm,
            keyWrapAlgorithm: uploadResult.encryptionMetadata.keyWrapAlgorithm,
            wrappedDataKey: uploadResult.encryptionMetadata.wrappedDataKey,
            wrapIv: uploadResult.encryptionMetadata.wrapIv,
            wrapTag: uploadResult.encryptionMetadata.wrapTag,
            dataIv: uploadResult.encryptionMetadata.dataIv,
            dataTag: uploadResult.encryptionMetadata.dataTag
          }
        });
      }

      return tx.credential.findUnique({
        where: { id: createdCredential.id },
        include: {
          institution: true,
          student: true,
          issuer: true,
          credentialKey: true
        }
      });
    });
  } catch (error) {
    let revokeCompensation = null;
    let unpinCompensation = null;

    try {
      revokeCompensation = await blockchainService.revokeCredential(chainResult.credentialId);
    } catch (revokeError) {
      revokeCompensation = { error: revokeError.message };
    }

    try {
      unpinCompensation = await ipfsService.unpinCID(uploadResult.cid, { bestEffort: true });
    } catch (unpinError) {
      unpinCompensation = { error: unpinError.message };
    }

    throw new AppError(
      500,
      "ISSUANCE_DB_FAILED",
      "Database commit failed after blockchain success; compensation executed",
      {
        txHash: chainResult.txHash,
        credentialId: chainResult.credentialId,
        cid: uploadResult.cid,
        revokeCompensation,
        unpinCompensation
      },
      error
    );
  }

  return {
    credential: credentialRecord,
    blockchain: chainResult,
    ipfs: {
      cid: uploadResult.cid,
      encrypted: uploadResult.encrypted,
      pinnedNodes: uploadResult.pinnedNodes
    }
  };
}

export async function revokeCredential({ authUser, credentialHash, reason }) {
  const normalizedHash = credentialHash.toLowerCase();
  const credential = await prisma.credential.findUnique({
    where: { credentialHash: normalizedHash },
    include: {
      issuer: true
    }
  });

  if (!credential) {
    throw new AppError(404, "CREDENTIAL_NOT_FOUND", "Credential not found");
  }

  if (credential.status === "REVOKED") {
    throw new AppError(409, "CREDENTIAL_ALREADY_REVOKED", "Credential already revoked");
  }

  const canRevoke =
    authUser.role === ROLES.SUPER_ADMIN ||
    (authUser.role === ROLES.INSTITUTION_ADMIN &&
      Boolean(authUser.institutionId) &&
      authUser.institutionId === credential.institutionId) ||
    credential.issuerId === authUser.sub;

  if (!canRevoke) {
    throw new AppError(403, "FORBIDDEN", "Not authorized to revoke this credential");
  }

  const chainResult = await blockchainService.revokeCredential(credential.credentialId);

  const revokedCredential = await prisma.$transaction(async (tx) => {
    const updatedCredential = await tx.credential.update({
      where: { id: credential.id },
      data: { status: "REVOKED" }
    });

    await tx.revocation.create({
      data: {
        credentialId: credential.id,
        revokedById: authUser.sub,
        reason,
        txHash: chainResult.txHash,
        revokedAt: new Date()
      }
    });

    return updatedCredential;
  });

  return {
    credential: revokedCredential,
    blockchain: chainResult
  };
}

export async function getCredentialByHash(credentialHash) {
  const normalizedHash = credentialHash.toLowerCase();
  await assertHashNotBlacklisted(normalizedHash);

  const credentialRecord = await prisma.credential.findUnique({
    where: { credentialHash: normalizedHash },
    include: {
      institution: true,
      student: true,
      issuer: true,
      revocation: true,
      credentialKey: true
    }
  });

  const onChain = await blockchainService.getCredentialByHash(normalizedHash);
  if (!credentialRecord && !onChain) {
    throw new AppError(404, "CREDENTIAL_NOT_FOUND", "Credential not found");
  }

  if (!credentialRecord || !onChain) {
    throw new AppError(409, "INTEGRITY_VIOLATION", "Credential missing from either DB or blockchain");
  }

  const ipfsVerification = await ipfsService.verifyCID(credentialRecord.ipfsCid, {
    expectedCredentialHash: credentialRecord.credentialHash,
    expectedFileChecksum: credentialRecord.fileChecksum,
    encrypted: credentialRecord.encrypted,
    encryptionMetadata: credentialRecord.credentialKey
      ? {
          keyVersion: credentialRecord.credentialKey.keyVersion,
          cipherAlgorithm: credentialRecord.credentialKey.cipherAlgorithm,
          keyWrapAlgorithm: credentialRecord.credentialKey.keyWrapAlgorithm,
          wrappedDataKey: credentialRecord.credentialKey.wrappedDataKey,
          wrapIv: credentialRecord.credentialKey.wrapIv,
          wrapTag: credentialRecord.credentialKey.wrapTag,
          dataIv: credentialRecord.credentialKey.dataIv,
          dataTag: credentialRecord.credentialKey.dataTag
        }
      : null
  });

  const integrity = evaluateCredentialIntegrity({
    blockchainRecord: onChain,
    dbRecord: credentialRecord,
    ipfsVerification
  });

  if (!integrity.passed) {
    throw new AppError(409, "INTEGRITY_VIOLATION", "Credential integrity verification failed", {
      integrity,
      onChain,
      dbHash: credentialRecord.credentialHash,
      dbCid: credentialRecord.ipfsCid
    });
  }

  return {
    credential: credentialRecord,
    onChain,
    ipfsVerification,
    integrity
  };
}

export async function getCredentialQr(credentialHash) {
  const normalizedHash = credentialHash.toLowerCase();
  await getCredentialByHash(normalizedHash);
  return generateVerificationQrCode(normalizedHash);
}

export async function blacklistCredentialHash({ actorUserId, credentialHash, reason }) {
  return blacklistHash(credentialHash, reason, actorUserId);
}

export async function getCredentialsByStudent(studentAddress) {
  const normalizedAddress = normalizeAddress(studentAddress);
  const student = await prisma.user.findUnique({
    where: { walletAddress: normalizedAddress },
    include: {
      studentCredentials: {
        include: {
          institution: true,
          issuer: true,
          revocation: true,
          credentialKey: true
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!student) {
    throw new AppError(404, "STUDENT_NOT_FOUND", "Student not found");
  }

  return student;
}
