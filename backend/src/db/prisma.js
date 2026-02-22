import { PrismaClient } from "@prisma/client";
import { logger } from "../config/logger.js";

export const prisma = new PrismaClient({
  log: ["warn", "error"]
});

export async function assertDatabaseConnectivity() {
  await prisma.$queryRaw`SELECT 1`;
  logger.info("Database connectivity check passed");
}
