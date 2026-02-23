import { z } from "zod";
import { ROLES } from "../constants/roles.js";
import { walletAddressSchema } from "./common.schemas.js";

const roleValues = Object.values(ROLES);

export const assignRoleSchema = z.object({
  walletAddress: walletAddressSchema,
  role: z.enum(roleValues),
  institutionId: z.string().min(1).optional()
});

export const institutionRequestSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, "Invalid institution code")
});

export const institutionDecisionSchema = z.object({
  reviewNotes: z.string().min(3).max(512).optional(),
  adminWallet: walletAddressSchema.optional()
});

export const issuerRequestSchema = z.object({
  institutionId: z.string().min(1)
});

export const issuerDecisionSchema = z.object({
  reviewNotes: z.string().min(3).max(512).optional()
});

export const walletRotationRequestSchema = z.object({
  newWalletAddress: walletAddressSchema,
  reason: z.string().min(5).max(512)
});

export const walletRotationDecisionSchema = z.object({
  reviewNote: z.string().min(3).max(512).optional(),
  proofMessage: z.string().min(10),
  proofSignature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature format")
});

export const idParamSchema = z.object({
  id: z.string().min(1)
});

export const institutionQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional()
});

export const walletRotationQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional()
});
