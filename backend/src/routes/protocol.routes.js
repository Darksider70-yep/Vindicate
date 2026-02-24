import { Router } from "express";
import { env } from "../config/env.js";
import { chainAgnosticAnchoringService } from "../services/interoperability/chain-anchoring.service.js";

const router = Router();

router.get("/meta", (_req, res) => {
  res.status(200).json({
    data: {
      protocolName: "Vindicate Credential Protocol",
      protocolVersion: env.PROTOCOL_VERSION,
      governanceContract: env.PROTOCOL_GOVERNANCE_CONTRACT,
      stakingContract: env.PROTOCOL_STAKING_CONTRACT,
      registryContract: env.PROTOCOL_REGISTRY_CONTRACT,
      apiVersion: "v1",
      timestamp: new Date().toISOString()
    }
  });
});

router.get("/chains", (_req, res) => {
  res.status(200).json({
    data: {
      supportedChains: chainAgnosticAnchoringService.getSupportedChains(),
      timestamp: new Date().toISOString()
    }
  });
});

export default router;