import { ethers } from "ethers";
import { prisma } from "../db/prisma.js";
import { ROLES } from "../constants/roles.js";
import { blockchainService } from "./blockchain/blockchain.service.js";
import { AppError } from "../utils/app-error.js";

function normalizeAddress(address, label = "wallet") {
  if (!ethers.isAddress(address)) {
    throw new AppError(400, "INVALID_ADDRESS", `Invalid ${label} address`);
  }
  return ethers.getAddress(address).toLowerCase();
}

function assertSuperAdmin(authUser) {
  if (authUser.role !== ROLES.SUPER_ADMIN) {
    throw new AppError(403, "FORBIDDEN", "Only super admin can perform this action");
  }
}

export async function requestInstitutionOnboarding({ authUser, name, code }) {
  const existing = await prisma.institution.findUnique({
    where: { code }
  });

  if (existing) {
    throw new AppError(409, "INSTITUTION_EXISTS", "Institution code already exists");
  }

  return prisma.institution.create({
    data: {
      name,
      code,
      status: "PENDING",
      verified: false,
      requestedById: authUser.sub
    }
  });
}

export async function approveInstitutionOnboarding({
  authUser,
  institutionId,
  adminWallet,
  reviewNotes
}) {
  assertSuperAdmin(authUser);
  const normalizedAdminWallet = normalizeAddress(adminWallet, "institution admin");

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId }
  });

  if (!institution) {
    throw new AppError(404, "INSTITUTION_NOT_FOUND", "Institution not found");
  }

  if (institution.status === "APPROVED") {
    throw new AppError(409, "INSTITUTION_ALREADY_APPROVED", "Institution already approved");
  }

  let chainGrantResult;
  try {
    chainGrantResult = await blockchainService.grantInstitutionAdmin(normalizedAdminWallet);
  } catch (error) {
    throw new AppError(
      502,
      "INSTITUTION_CHAIN_SYNC_FAILED",
      "Failed to grant institution admin role on-chain",
      undefined,
      error
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const adminUser = await tx.user.upsert({
        where: { walletAddress: normalizedAdminWallet },
        create: {
          walletAddress: normalizedAdminWallet,
          role: ROLES.INSTITUTION_ADMIN,
          institutionId
        },
        update: {
          role: ROLES.INSTITUTION_ADMIN,
          institutionId
        }
      });

      const updatedInstitution = await tx.institution.update({
        where: { id: institutionId },
        data: {
          status: "APPROVED",
          verified: true,
          adminWallet: normalizedAdminWallet,
          reviewedById: authUser.sub,
          reviewNotes: reviewNotes ?? null
        }
      });

      return {
        institution: updatedInstitution,
        adminUser
      };
    });

    return {
      ...result,
      blockchain: chainGrantResult
    };
  } catch (error) {
    try {
      await blockchainService.revokeInstitutionAdmin(normalizedAdminWallet);
    } catch {
      // If compensation fails, upstream observability captures the primary error.
    }
    throw new AppError(
      500,
      "INSTITUTION_APPROVAL_DB_FAILED",
      "Institution approved on-chain but failed to persist database state",
      undefined,
      error
    );
  }
}

export async function rejectInstitutionOnboarding({
  authUser,
  institutionId,
  reviewNotes
}) {
  assertSuperAdmin(authUser);
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId }
  });

  if (!institution) {
    throw new AppError(404, "INSTITUTION_NOT_FOUND", "Institution not found");
  }

  if (institution.status === "APPROVED") {
    throw new AppError(409, "INSTITUTION_ALREADY_APPROVED", "Approved institutions cannot be rejected");
  }

  return prisma.institution.update({
    where: { id: institutionId },
    data: {
      status: "REJECTED",
      verified: false,
      reviewedById: authUser.sub,
      reviewNotes: reviewNotes ?? null
    }
  });
}

export async function listInstitutions({ status }) {
  return prisma.institution.findMany({
    where: {
      status: status ?? undefined
    },
    include: {
      requestedBy: true,
      reviewedBy: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}
