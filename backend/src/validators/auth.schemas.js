import { z } from "zod";
import { walletAddressSchema } from "./common.schemas.js";

export const nonceRequestSchema = z.object({
  address: walletAddressSchema
});

export const verifySiweSchema = z.object({
  message: z.string().min(10),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature format")
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10).optional()
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(10).optional(),
  allSessions: z.boolean().optional().default(false)
});
