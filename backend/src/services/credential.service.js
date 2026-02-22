import { ethers } from "ethers";
import { prisma } from "../db/prisma.js";
import { ROLES } from "../constants/roles.js";
import { blockchainService } from "./blockchain/blockchain.service.js";
import { ipfsService } from "./ipfs/ipfs.service.js";
import { AppError } from "../utils/app-error.js";

function normalizeAddress(address) {
  if (!ethers.isAddress(address)) {
    throw new AppError(400, "INVALID_ADDRESS", "Invalid wallet address");
  }
  return ethers.getAddress(address).toLowerCase();
}

async function assertIssuanceAllowed(authUser, institutionId) {
  if (authUser.role === ROLES.ADMIN) {
    return;
  }

  if (authUser.role === ROLES.INSTITUTION_ADMIN) {
    if (!authUser.institutionId || authUser.institutionId !== institutionId) {
      throw new AppError(403, "FORBIDDEN", "Institution admins can only issue for their institution");
    }
    return;
  }

  if (authUser.role === ROLES.ISSUER) {
    const issuerRecord = await prisma.issuer.findFirst({
      where: {
        userId: authUser.sub,
        institutionId,
        status: "ACTIVE"
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
  credential,
  encrypt = false
}) {
  const issuerUserId = authUser.sub;
  const normalizedStudentAddress = normalizeAddress(studentAddress);

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

  const payload = {
    studentAddress: normalizedStudentAddress,
    institutionId,
    issuerAddress: issuerUser.walletAddress,
    credential
  };

  const { cid, credentialHash, encrypted } = await ipfsService.uploadCredentialPayload(payload, {
    encrypt
  });

  const existingCredential = await prisma.credential.findUnique({
    where: { credentialHash }
  });
  if (existingCredential) {
    throw new AppError(409, "DUPLICATE_CREDENTIAL", "Credential hash already exists");
  }

  const chainResult = await blockchainService.issueCredential(normalizedStudentAddress, credentialHash);
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

  const credentialRecord = await prisma.credential.create({
    data: {
      credentialId: BigInt(chainResult.credentialId),
      credentialHash,
      studentId: studentUser.id,
      issuerId: issuerUser.id,
      institutionId,
      metadataCid: cid,
      txHash: chainResult.txHash,
      issuedAt: chainResult.issuedAt
    },
    include: {
      institution: true,
      student: true,
      issuer: true
    }
  });

  return {
    credential: credentialRecord,
    blockchain: chainResult,
    ipfs: {
      cid,
      encrypted
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

  if (credential.revoked) {
    throw new AppError(409, "CREDENTIAL_ALREADY_REVOKED", "Credential already revoked");
  }

  const canRevoke =
    authUser.role === ROLES.ADMIN ||
    authUser.role === ROLES.INSTITUTION_ADMIN ||
    credential.issuerId === authUser.sub;

  if (!canRevoke) {
    throw new AppError(403, "FORBIDDEN", "Not authorized to revoke this credential");
  }

  const chainResult = await blockchainService.revokeCredential(Number(credential.credentialId));

  const revokedCredential = await prisma.$transaction(async (tx) => {
    const updatedCredential = await tx.credential.update({
      where: { id: credential.id },
      data: { revoked: true }
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
  const credentialRecord = await prisma.credential.findUnique({
    where: { credentialHash: normalizedHash },
    include: {
      institution: true,
      student: true,
      issuer: true,
      revocation: true
    }
  });

  const onChain = await blockchainService.getCredentialByHash(normalizedHash);
  if (!credentialRecord && !onChain) {
    throw new AppError(404, "CREDENTIAL_NOT_FOUND", "Credential not found");
  }

  let payload = null;
  let ipfsIntegrity = null;
  if (credentialRecord?.metadataCid) {
    const fetchedPayload = await ipfsService.fetchCredentialPayload(credentialRecord.metadataCid);
    payload = fetchedPayload.payload;
    ipfsIntegrity = {
      computedHash: fetchedPayload.computedHash,
      matchesOnChainHash: fetchedPayload.computedHash === normalizedHash
    };
  }

  return {
    credential: credentialRecord,
    onChain,
    payload,
    ipfsIntegrity
  };
}

export async function getCredentialsByStudent(studentAddress) {
  const normalizedAddress = normalizeAddress(studentAddress);
  const student = await prisma.user.findUnique({
    where: { walletAddress: normalizedAddress },
    include: {
      credentials: {
        include: {
          institution: true,
          issuer: true,
          revocation: true
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
