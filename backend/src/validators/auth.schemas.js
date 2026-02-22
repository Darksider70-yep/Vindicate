import { z } from "zod";
import { walletAddressSchema } from "./common.schemas.js";

export const loginSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("challenge"),
    address: walletAddressSchema
  }),
  z.object({
    action: z.literal("verify"),
    message: z.string().min(10),
    signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature format")
  })
]);
