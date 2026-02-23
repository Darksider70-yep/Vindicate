import { ethers } from "ethers";
import { SiweMessage } from "siwe";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { PRIVILEGED_ROLES, ROLES } from "../constants/roles.js";
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

function assertNoSelfPrivilegeEscalation(authUser, targetUserId, targetRole) {
  if (
    authUser.sub === targetUserId &&
    PRIVILEGED_ROLES.includes(targetRole)
  ) {
    throw new AppError(
      403,
      "ROLE_SELF_ASSIGN_FORBIDDEN",
      "Cannot self-assign privileged roles"
    );
  }
}

async function runChainOperationsWithCompensation(operations) {
  const executed = [];
  try {
    for (const operation of operations) {
      const result = await operation.run();
      executed.push({ ...operation, result });
    }
    return executed;
  } catch (error) {
    for (let index = executed.length - 1; index >= 0; index -= 1) {
      const operation = executed[index];
      try {
        await operation.undo();
      } catch {
        // Best-effort compensation; primary error is propagated.
      }
    }
    throw error;
  }
}

async function verifyWalletRotationProof({
  requestId,
  expectedAddress,
  proofMessage,
  proofSignature
}) {
  let parsedMessage;
  try {
    parsedMessage = new SiweMessage(proofMessage);
  } catch (error) {
    throw new AppError(
      400,
      "WALLET_ROTATION_PROOF_INVALID",
      "Invalid wallet rotation proof message",
      undefined,
      error
    );
  }

  const normalizedProofAddress = normalizeAddress(parsedMessage.address, "proof");
  if (normalizedProofAddress !== expectedAddress) {
    throw new AppError(
      401,
      "WALLET_ROTATION_PROOF_ADDRESS_MISMATCH",
      "Proof address does not match requested new wallet"
    );
  }

  if (parsedMessage.domain !== env.SIWE_DOMAIN || parsedMessage.uri !== env.SIWE_URI) {
    throw new AppError(401, "WALLET_ROTATION_PROOF_CONTEXT_INVALID", "Proof SIWE context mismatch");
  }

  if (!proofMessage.toLowerCase().includes(requestId.toLowerCase())) {
    throw new AppError(
      401,
      "WALLET_ROTATION_PROOF_BINDING_INVALID",
      "Proof message must include wallet rotation request id"
    );
  }

  const verification = await parsedMessage.verify({
    signature: proofSignature,
    domain: env.SIWE_DOMAIN
  });

  if (!verification.success) {
    throw new AppError(401, "WALLET_ROTATION_PROOF_INVALID", "Invalid wallet rotation proof signature");
  }
}

function buildRoleSyncOperations({ oldRole, targetRole, walletAddress }) {
  const operations = [];

  if (oldRole === ROLES.INSTITUTION_ADMIN && targetRole !== ROLES.INSTITUTION_ADMIN) {
    operations.push({
      run: () => blockchainService.revokeInstitutionAdmin(walletAddress),
      undo: () => blockchainService.grantInstitutionAdmin(walletAddress)
    });
  }

  if (oldRole === ROLES.SUPER_ADMIN && targetRole !== ROLES.SUPER_ADMIN) {
    operations.push({
      run: () => blockchainService.revokeSuperAdmin(walletAddress),
      undo: () => blockchainService.grantSuperAdmin(walletAddress)
    });
  }

  if (targetRole === ROLES.INSTITUTION_ADMIN && oldRole !== ROLES.INSTITUTION_ADMIN) {
    operations.push({
      run: () => blockchainService.grantInstitutionAdmin(walletAddress),
      undo: () => blockchainService.revokeInstitutionAdmin(walletAddress)
    });
  }

  if (targetRole === ROLES.SUPER_ADMIN && oldRole !== ROLES.SUPER_ADMIN) {
    operations.push({
      run: () => blockchainService.grantSuperAdmin(walletAddress),
      undo: () => blockchainService.revokeSuperAdmin(walletAddress)
    });
  }

  return operations;
}

export async function assignUserRole({
  authUser,
  walletAddress,
  role,
  institutionId
}) {
  assertSuperAdmin(authUser);
  const normalizedWallet = normalizeAddress(walletAddress);

  const targetUser = await prisma.user.upsert({
    where: { walletAddress: normalizedWallet },
    create: {
      walletAddress: normalizedWallet,
      role: ROLES.STUDENT
    },
    update: {}
  });

  assertNoSelfPrivilegeEscalation(authUser, targetUser.id, role);

  if (role === ROLES.VERIFIED_ISSUER || targetUser.role === ROLES.VERIFIED_ISSUER) {
    throw new AppError(
      409,
      "ROLE_ASSIGNMENT_NOT_ALLOWED",
      "Use issuer approval governance flow for VERIFIED_ISSUER role changes"
    );
  }

  if (targetUser.role === role && targetUser.institutionId === (institutionId ?? targetUser.institutionId)) {
    throw new AppError(409, "ROLE_ALREADY_ASSIGNED", "Role already assigned");
  }

  if (role === ROLES.INSTITUTION_ADMIN) {
    if (!institutionId) {
      throw new AppError(
        400,
        "INSTITUTION_REQUIRED",
        "institutionId is required for INSTITUTION_ADMIN role"
      );
    }
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId }
    });
    if (!institution || institution.status !== "APPROVED" || !institution.verified) {
      throw new AppError(409, "INSTITUTION_NOT_VERIFIED", "Institution must be approved");
    }
  }

  const chainOperations = buildRoleSyncOperations({
    oldRole: targetUser.role,
    targetRole: role,
    walletAddress: normalizedWallet
  });

  let executedChainOps;
  try {
    executedChainOps = await runChainOperationsWithCompensation(chainOperations);
  } catch (error) {
    throw new AppError(
      502,
      "ROLE_CHAIN_SYNC_FAILED",
      "Failed to sync role update on-chain",
      undefined,
      error
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: targetUser.id },
        data: {
          role,
          institutionId: role === ROLES.INSTITUTION_ADMIN ? institutionId : targetUser.institutionId
        }
      });

      if (role === ROLES.INSTITUTION_ADMIN && institutionId) {
        await tx.institution.update({
          where: { id: institutionId },
          data: {
            adminWallet: normalizedWallet,
            verified: true,
            status: "APPROVED"
          }
        });
      }

      if (targetUser.role === ROLES.INSTITUTION_ADMIN && role !== ROLES.INSTITUTION_ADMIN) {
        await tx.institution.updateMany({
          where: {
            adminWallet: normalizedWallet
          },
          data: {
            adminWallet: null
          }
        });
      }

      return updatedUser;
    });
  } catch (error) {
    for (let index = executedChainOps.length - 1; index >= 0; index -= 1) {
      try {
        await executedChainOps[index].undo();
      } catch {
        // Best-effort compensation.
      }
    }

    throw new AppError(
      500,
      "ROLE_ASSIGNMENT_DB_FAILED",
      "Role synced on-chain but failed to persist database state",
      undefined,
      error
    );
  }
}

export async function requestWalletRotation({
  authUser,
  newWalletAddress,
  reason
}) {
  const normalizedNewWallet = normalizeAddress(newWalletAddress, "new wallet");
  const user = await prisma.user.findUnique({
    where: { id: authUser.sub }
  });

  if (!user) {
    throw new AppError(401, "AUTH_USER_NOT_FOUND", "Authenticated user not found");
  }

  if (user.walletAddress === normalizedNewWallet) {
    throw new AppError(409, "WALLET_ALREADY_ACTIVE", "New wallet is already active");
  }

  const walletAlreadyUsed = await prisma.user.findUnique({
    where: { walletAddress: normalizedNewWallet }
  });

  if (walletAlreadyUsed) {
    throw new AppError(409, "WALLET_ALREADY_BOUND", "New wallet is already associated with an account");
  }

  const pendingRequest = await prisma.walletRotationRequest.findFirst({
    where: {
      userId: user.id,
      status: "PENDING"
    }
  });

  if (pendingRequest) {
    throw new AppError(409, "WALLET_ROTATION_PENDING", "A pending wallet rotation request already exists");
  }

  return prisma.walletRotationRequest.create({
    data: {
      userId: user.id,
      oldWalletAddress: user.walletAddress,
      newWalletAddress: normalizedNewWallet,
      reason,
      requestedById: authUser.sub,
      status: "PENDING"
    }
  });
}

function buildWalletRotationChainOps(role, oldWallet, newWallet) {
  if (role === ROLES.VERIFIED_ISSUER) {
    return [
      {
        run: () => blockchainService.removeIssuer(oldWallet),
        undo: () => blockchainService.approveIssuer(oldWallet)
      },
      {
        run: () => blockchainService.approveIssuer(newWallet),
        undo: () => blockchainService.removeIssuer(newWallet)
      }
    ];
  }

  if (role === ROLES.INSTITUTION_ADMIN) {
    return [
      {
        run: () => blockchainService.revokeInstitutionAdmin(oldWallet),
        undo: () => blockchainService.grantInstitutionAdmin(oldWallet)
      },
      {
        run: () => blockchainService.grantInstitutionAdmin(newWallet),
        undo: () => blockchainService.revokeInstitutionAdmin(newWallet)
      }
    ];
  }

  if (role === ROLES.SUPER_ADMIN) {
    return [
      {
        run: () => blockchainService.revokeSuperAdmin(oldWallet),
        undo: () => blockchainService.grantSuperAdmin(oldWallet)
      },
      {
        run: () => blockchainService.grantSuperAdmin(newWallet),
        undo: () => blockchainService.revokeSuperAdmin(newWallet)
      }
    ];
  }

  return [];
}

export async function approveWalletRotation({
  authUser,
  requestId,
  reviewNote,
  proofMessage,
  proofSignature
}) {
  assertSuperAdmin(authUser);
  const request = await prisma.walletRotationRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        include: {
          issuerProfile: true
        }
      }
    }
  });

  if (!request) {
    throw new AppError(404, "WALLET_ROTATION_NOT_FOUND", "Wallet rotation request not found");
  }

  if (request.status !== "PENDING") {
    throw new AppError(409, "WALLET_ROTATION_NOT_PENDING", "Wallet rotation request is not pending");
  }

  await verifyWalletRotationProof({
    requestId,
    expectedAddress: request.newWalletAddress,
    proofMessage,
    proofSignature
  });

  const chainOps = buildWalletRotationChainOps(
    request.user.role,
    request.oldWalletAddress,
    request.newWalletAddress
  );

  try {
    await runChainOperationsWithCompensation(chainOps);
  } catch (error) {
    throw new AppError(
      502,
      "WALLET_ROTATION_CHAIN_SYNC_FAILED",
      "Failed to sync wallet rotation on-chain",
      undefined,
      error
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: request.userId },
        data: {
          walletAddress: request.newWalletAddress
        }
      });

      await tx.issuer.updateMany({
        where: { userId: request.userId },
        data: {
          walletAddress: request.newWalletAddress
        }
      });

      if (request.user.role === ROLES.INSTITUTION_ADMIN && request.user.institutionId) {
        await tx.institution.update({
          where: { id: request.user.institutionId },
          data: {
            adminWallet: request.newWalletAddress
          }
        });
      }

      const now = new Date();
      await tx.authSession.updateMany({
        where: {
          userId: request.userId,
          revokedAt: null
        },
        data: {
          revokedAt: now,
          revokeReason: "wallet_rotation"
        }
      });

      await tx.refreshToken.updateMany({
        where: {
          session: {
            userId: request.userId
          },
          revokedAt: null
        },
        data: {
          revokedAt: now
        }
      });

      const updatedRequest = await tx.walletRotationRequest.update({
        where: { id: request.id },
        data: {
          status: "APPROVED",
          reviewedById: authUser.sub,
          reviewNote: reviewNote ?? null,
          reviewedAt: now
        }
      });

      return {
        request: updatedRequest,
        user: updatedUser
      };
    });

    return result;
  } catch (error) {
    for (let index = chainOps.length - 1; index >= 0; index -= 1) {
      try {
        await chainOps[index].undo();
      } catch {
        // Best-effort compensation.
      }
    }
    throw new AppError(
      500,
      "WALLET_ROTATION_DB_FAILED",
      "Wallet rotation synced on-chain but failed in database",
      undefined,
      error
    );
  }
}

export async function rejectWalletRotation({
  authUser,
  requestId,
  reviewNote
}) {
  assertSuperAdmin(authUser);
  const request = await prisma.walletRotationRequest.findUnique({
    where: { id: requestId }
  });

  if (!request) {
    throw new AppError(404, "WALLET_ROTATION_NOT_FOUND", "Wallet rotation request not found");
  }

  if (request.status !== "PENDING") {
    throw new AppError(409, "WALLET_ROTATION_NOT_PENDING", "Wallet rotation request is not pending");
  }

  return prisma.walletRotationRequest.update({
    where: { id: request.id },
    data: {
      status: "REJECTED",
      reviewedById: authUser.sub,
      reviewNote: reviewNote ?? null,
      reviewedAt: new Date()
    }
  });
}

export async function listWalletRotationRequests({ status }) {
  return prisma.walletRotationRequest.findMany({
    where: {
      status: status ?? undefined
    },
    include: {
      user: true,
      requestedBy: true,
      reviewedBy: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}
