import { z } from "zod";
import { bytes32Schema } from "./common.schemas.js";
import { didSchema } from "./did.schemas.js";

export const issueVcSchema = z.object({
  credentialHash: bytes32Schema,
  subjectDid: didSchema.optional(),
  contexts: z.array(z.string().url()).optional(),
  types: z.array(z.string().min(1).max(128)).optional(),
  expirationDate: z.string().datetime().optional(),
  credentialSubject: z
    .record(z.any())
    .refine((value) => Object.keys(value).length > 0, "credentialSubject must not be empty")
});

export const vcHashParamSchema = z.object({
  hash: bytes32Schema
});

export const vcIdParamSchema = z.object({
  id: z.string().min(1)
});

export const verifyVcQuerySchema = z.object({
  requireChainAnchor: z.coerce.boolean().optional().default(true)
});

export const selectiveDisclosureIssueSchema = z.object({
  attributeKey: z.string().min(1).max(128),
  challenge: z.string().min(4).max(512).optional()
});

export const selectiveDisclosureVerifySchema = z.object({
  proof: z.record(z.any()),
  proofSignature: z.string().min(32),
  challenge: z.string().min(4).max(512).optional()
});

export const offlineTokenCreateSchema = z.object({
  verifierChallenge: z.string().min(4).max(512).optional()
});

export const offlineTokenVerifySchema = z.object({
  token: z.string().min(16),
  verifierChallenge: z.string().min(4).max(512).optional()
});

