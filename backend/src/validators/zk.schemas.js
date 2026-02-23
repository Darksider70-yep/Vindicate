import { z } from "zod";
import { bytes32Schema } from "./common.schemas.js";
import { didSchema } from "./did.schemas.js";

export const createZkChallengeSchema = z.object({
  vcHash: bytes32Schema,
  verifierDid: didSchema
});

export const verifyZkProofSchema = z.object({
  challengeId: z.string().min(1),
  nullifierHash: bytes32Schema,
  proof: z.record(z.any()),
  publicSignals: z.array(z.any()).min(1),
  verificationMethod: z.string().min(2).max(64).optional(),
  disclosedAttribute: z
    .object({
      key: z.string().min(1).max(128),
      value: z.any()
    })
    .optional()
});

export const zkChallengeParamSchema = z.object({
  id: z.string().min(1)
});
