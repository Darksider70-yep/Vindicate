import { z } from "zod";
import { bytes32Schema, walletAddressSchema } from "./common.schemas.js";
import { env } from "../config/env.js";

function parseBase64File(fileBase64) {
  try {
    const normalized = fileBase64.replace(/^data:.*;base64,/, "");
    const buffer = Buffer.from(normalized, "base64");
    if (buffer.length === 0) {
      return null;
    }
    return {
      buffer,
      normalized
    };
  } catch {
    return null;
  }
}

export const issueCredentialSchema = z.object({
  studentAddress: walletAddressSchema,
  institutionId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z
    .string()
    .min(1)
    .transform((value) => value.toLowerCase())
    .refine((value) => env.ALLOWED_UPLOAD_MIME_TYPES.includes(value), {
      message: "mimeType is not allowed"
    }),
  fileBase64: z
    .string()
    .min(16)
    .refine((value) => parseBase64File(value) !== null, {
      message: "fileBase64 is invalid"
    })
    .refine((value) => {
      const parsed = parseBase64File(value);
      return parsed && parsed.buffer.length <= env.UPLOAD_MAX_BYTES;
    }, {
      message: "file exceeds upload size limit"
    }),
  metadata: z.record(z.any()).optional().default({}),
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
  status: z.enum(["PENDING", "ACTIVE", "REVOKED", "REJECTED"]).optional()
});

export const blacklistHashSchema = z.object({
  credentialHash: bytes32Schema,
  reason: z.string().min(3).max(512)
});
