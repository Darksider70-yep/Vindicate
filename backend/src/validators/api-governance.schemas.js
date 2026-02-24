import { z } from "zod";

export const clientIdParamSchema = z.object({
  clientId: z.string().trim().min(2).max(64)
});

export const rotateApiKeySchema = z.object({
  expiresInDays: z.coerce.number().int().min(1).max(365).default(90),
  tier: z.string().trim().min(2).max(32).optional(),
  name: z.string().trim().min(2).max(128).optional()
});

export const usageQuerySchema = z.object({
  sinceMinutes: z.coerce.number().int().min(1).max(24 * 60 * 30).default(60)
});