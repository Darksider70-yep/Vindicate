import { ethers } from "ethers";
import { prisma } from "../db/prisma.js";
import { ROLES } from "../constants/roles.js";
import { blockchainService } from "./blockchain/blockchain.service.js";
import { AppError } from "../utils/app-error.js";

function normalizeAddress(address) {
  if (!ethers.isAddress(address)) {
    throw new AppError(400, "INVALID_ADDRESS", "Invalid wallet address");
  }
  return ethers.getAddress(address).toLowerCase();
}

function assertIssuerGovernor(authUser, institutionId) {
  if (authUser.role === ROLES.SUPER_ADMIN) {
    return;
  }

  if (authUser.role === ROLES.INSTITUTION_ADMIN && authUser.institutionId === institutionId) {
    return;
  }

  throw new AppError(403, "FORBIDDEN", "Not authorized to govern issuer approvals");
}

export async function listIssuers({ institutionId, status }) {
  return prisma.issuer.findMany({
    where: {
      institutionId: institutionId || undefined,
      status: status || undefined
    },
    include: {
      user: true,
      institution: true,
      approvedBy: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function requestIssuerApproval({ authUser, institutionId }) {
  const [institution, user] = await Promise.all([
    prisma.institution.findUnique({
      where: { id: institutionId }
    }),
    prisma.user.findUnique({
      where: { id: authUser.sub }
    })
  ]);

  if (!user) {
    throw new AppError(401, "AUTH_USER_NOT_FOUND", "Authenticated user not found");
  }

  if (!institution) {
    throw new AppError(404, "INSTITUTION_NOT_FOUND", "Institution not found");
  }

  if (institution.status !== "APPROVED" || !institution.verified) {
    throw new AppError(409, "INSTITUTION_NOT_VERIFIED", "Institution is not approved");
  }

  const existing = await prisma.issuer.findUnique({
    where: { userId: user.id }
  });

  if (existing?.status === "ACTIVE" && existing.approved) {
    throw new AppError(409, "ISSUER_ALREADY_APPROVED", "Issuer already approved");
  }

  if (existing?.status === "PENDING") {
    return existing;
  }

  const normalizedWallet = normalizeAddress(user.walletAddress);
  if (existing) {
    return prisma.issuer.update({
      where: { id: existing.id },
      data: {
        institutionId,
        walletAddress: normalizedWallet,
        status: "PENDING",
        approved: false,
        approvedById: null,
        requestedAt: new Date(),
        approvedAt: null,
        revokedAt: null,
        reviewNotes: null
      }
    });
  }

  return prisma.issuer.create({
    data: {
      userId: user.id,
      institutionId,
      walletAddress: normalizedWallet,
      status: "PENDING",
      approved: false
    }
  });
}

export async function approveIssuerRequest({ authUser, issuerId, reviewNotes }) {
  const issuer = await prisma.issuer.findUnique({
    where: { id: issuerId },
    include: {
      user: true,
      institution: true
    }
  });

  if (!issuer) {
    throw new AppError(404, "ISSUER_REQUEST_NOT_FOUND", "Issuer request not found");
  }

  assertIssuerGovernor(authUser, issuer.institutionId);

  if (issuer.status === "ACTIVE" && issuer.approved) {
    throw new AppError(409, "ISSUER_ALREADY_APPROVED", "Issuer already approved");
  }

  if (issuer.institution.status !== "APPROVED") {
    throw new AppError(409, "INSTITUTION_NOT_VERIFIED", "Cannot approve issuer for unverified institution");
  }

  const onChain = await blockchainService.approveIssuer(issuer.walletAddress);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updatedIssuer = await tx.issuer.update({
        where: { id: issuer.id },
        data: {
          status: "ACTIVE",
          approved: true,
          approvedById: authUser.sub,
          approvedAt: new Date(),
          revokedAt: null,
          reviewNotes: reviewNotes ?? null
        }
      });

      const updatedUser = await tx.user.update({
        where: { id: issuer.userId },
        data: {
          role: ROLES.VERIFIED_ISSUER,
          institutionId: issuer.institutionId
        }
      });

      return { issuer: updatedIssuer, user: updatedUser };
    });

    return {
      ...result,
      blockchain: onChain
    };
  } catch (error) {
    try {
      await blockchainService.removeIssuer(issuer.walletAddress);
    } catch {
      // Best-effort compensation.
    }
    throw new AppError(
      500,
      "ISSUER_APPROVAL_DB_FAILED",
      "Issuer approved on-chain but failed to persist database state",
      undefined,
      error
    );
  }
}

export async function rejectIssuerRequest({ authUser, issuerId, reviewNotes }) {
  const issuer = await prisma.issuer.findUnique({
    where: { id: issuerId }
  });

  if (!issuer) {
    throw new AppError(404, "ISSUER_REQUEST_NOT_FOUND", "Issuer request not found");
  }

  assertIssuerGovernor(authUser, issuer.institutionId);

  if (issuer.status === "ACTIVE" && issuer.approved) {
    throw new AppError(409, "ISSUER_ALREADY_APPROVED", "Approved issuer cannot be rejected");
  }

  return prisma.issuer.update({
    where: { id: issuerId },
    data: {
      status: "REJECTED",
      approved: false,
      approvedById: authUser.sub,
      reviewNotes: reviewNotes ?? null
    }
  });
}

export async function removeIssuer({ authUser, issuerId, reviewNotes }) {
  const issuer = await prisma.issuer.findUnique({
    where: { id: issuerId },
    include: {
      user: true
    }
  });

  if (!issuer) {
    throw new AppError(404, "ISSUER_NOT_FOUND", "Issuer not found");
  }

  assertIssuerGovernor(authUser, issuer.institutionId);

  if (issuer.status !== "ACTIVE" || !issuer.approved) {
    throw new AppError(409, "ISSUER_NOT_ACTIVE", "Issuer is not active");
  }

  const onChain = await blockchainService.removeIssuer(issuer.walletAddress);

  const result = await prisma.$transaction(async (tx) => {
    const updatedIssuer = await tx.issuer.update({
      where: { id: issuer.id },
      data: {
        status: "REVOKED",
        approved: false,
        revokedAt: new Date(),
        reviewNotes: reviewNotes ?? null
      }
    });

    const updatedUser = await tx.user.update({
      where: { id: issuer.userId },
      data: {
        role: ROLES.STUDENT
      }
    });

    return {
      issuer: updatedIssuer,
      user: updatedUser
    };
  });

  return {
    ...result,
    blockchain: onChain
  };
}
