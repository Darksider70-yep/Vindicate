import { listIssuers } from "../services/issuer.service.js";

export async function getIssuers(req, res) {
  const issuers = await listIssuers({
    institutionId: req.query.institutionId,
    status: req.query.status
  });

  return res.status(200).json({
    data: issuers
  });
}
