import { z } from "zod";
import { walletAddressSchema } from "./common.schemas.js";

export const didSchema = z
  .string()
  .regex(
    /^did:ethr:(?:[a-zA-Z0-9_.:-]+:)?0x[a-fA-F0-9]{40}$/,
    "Invalid did:ethr identifier"
  )
  .transform((value) => value.toLowerCase());

export const registerStudentDidSchema = z.object({
  walletAddress: walletAddressSchema.optional(),
  serviceEndpoint: z.string().url().optional()
});

export const registerInstitutionDidSchema = z.object({
  institutionId: z.string().min(1),
  controllerAddress: walletAddressSchema.optional(),
  serviceEndpoint: z.string().url().optional()
});

export const resolveDidQuerySchema = z.object({
  did: didSchema,
  verifyIpfs: z.coerce.boolean().optional().default(true)
});

export const verifyDidOwnershipSchema = z.object({
  did: didSchema,
  challenge: z.string().min(8).max(512),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature format")
});
