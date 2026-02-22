import { z } from "zod";
import { bytes32Schema, walletAddressSchema } from "./common.schemas.js";

export const issueCredentialSchema = z.object({
  studentAddress: walletAddressSchema,
  institutionId: z.string().min(1),
  credential: z.record(z.any()).refine((value) => Object.keys(value).length > 0, {
    message: "credential payload cannot be empty"
  }),
  encrypt: z.boolean().optional().default(false)
});

export const revokeCredentialSchema = z.object({
  credentialHash: bytes32Schema,
  reason: z.string().min(3).max(512)
});

export const credentialHashParamSchema = z.object({
  hash: bytes32Schema
});

export const studentAddressParamSchema = z.object({
  address: walletAddressSchema
});

export const issuerQuerySchema = z.object({
  institutionId: z.string().optional(),
  status: z.enum(["ACTIVE", "REVOKED"]).optional()
});
