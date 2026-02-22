import { z } from "zod";

export const walletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address")
  .transform((value) => value.toLowerCase());

export const bytes32Schema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid bytes32 hash")
  .transform((value) => value.toLowerCase());
