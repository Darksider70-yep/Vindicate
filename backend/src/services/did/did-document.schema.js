import { z } from "zod";

export const didServiceSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  serviceEndpoint: z.string().url()
});

export const didVerificationMethodSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  controller: z.string().min(1),
  blockchainAccountId: z.string().min(1)
});

export const didDocumentSchema = z.object({
  "@context": z.array(z.string().url()).min(1),
  id: z.string().min(1),
  verificationMethod: z.array(didVerificationMethodSchema).min(1),
  authentication: z.array(z.string().min(1)).min(1),
  assertionMethod: z.array(z.string().min(1)).min(1),
  service: z.array(didServiceSchema)
});
