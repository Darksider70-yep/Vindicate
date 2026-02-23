import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma, assertDatabaseConnectivity } from "./db/prisma.js";
import { blockchainService } from "./services/blockchain/blockchain.service.js";
import { ipfsService } from "./services/ipfs.service.js";
import { initSentry } from "./services/sentry.js";

async function assertCriticalDependencies() {
  await Promise.all([
    assertDatabaseConnectivity(),
    blockchainService.assertConnectivity(),
    ipfsService.assertConnectivity()
  ]);
}

async function bootstrap() {
  initSentry();

  if (env.NODE_ENV === "development") {
    assertCriticalDependencies().catch((error) => {
      logger.warn(
        { error: error.message },
        "Dependency connectivity check failed during startup; server will continue in development"
      );
    });
  } else {
    await assertCriticalDependencies();
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Vindicate backend started");
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, "Graceful shutdown initiated");
    server.close(async () => {
      await prisma.$disconnect();
      logger.info("Shutdown complete");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => {
    shutdown("SIGINT").catch((error) => {
      logger.error({ error }, "Shutdown error");
      process.exit(1);
    });
  });
  process.on("SIGTERM", () => {
    shutdown("SIGTERM").catch((error) => {
      logger.error({ error }, "Shutdown error");
      process.exit(1);
    });
  });
}

bootstrap().catch((error) => {
  logger.fatal({ error }, "Server bootstrap failed");
  process.exit(1);
});
