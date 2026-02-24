import { apiGovernanceService } from "../../services/compliance/api-governance.service.js";

export async function rotateApiKey(req, res) {
  const result = await apiGovernanceService.rotateClientKey(req.params.clientId, {
    actorId: req.auth.sub,
    expiresInDays: req.body.expiresInDays,
    tier: req.body.tier,
    name: req.body.name
  });

  return res.status(201).json({
    data: result
  });
}

export async function getApiUsage(req, res) {
  const usage = apiGovernanceService.getUsageSnapshot({
    sinceMinutes: req.query.sinceMinutes
  });

  return res.status(200).json({
    data: usage
  });
}