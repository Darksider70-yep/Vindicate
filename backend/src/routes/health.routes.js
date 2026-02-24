import { Router } from "express";
import { metricsHandler } from "../middlewares/metrics.js";
import { assertDatabaseConnectivity } from "../db/prisma.js";
import { blockchainService } from "../services/blockchain/blockchain.service.js";
import { ipfsService } from "../services/ipfs.service.js";
import { env } from "../config/env.js";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "vindicate-backend",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

router.get("/ready", async (_req, res, next) => {
  try {
    await Promise.all([
      assertDatabaseConnectivity(),
      blockchainService.assertConnectivity(),
      ipfsService.assertConnectivity()
    ]);

    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

router.get("/metrics", metricsHandler);

router.get("/slo", (_req, res) => {
  res.status(200).json({
    status: "ok",
    targets: {
      uptime: "99.9%",
      verificationLatencyMs: env.SLO_VERIFICATION_LATENCY_MS,
      issuanceLatencyMs: env.SLO_ISSUANCE_LATENCY_MS
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
