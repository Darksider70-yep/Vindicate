import {
  approveIssuerRequest,
  listIssuers,
  rejectIssuerRequest,
  removeIssuer,
  requestIssuerApproval
} from "../services/issuer.service.js";

export async function getIssuers(req, res) {
  const issuers = await listIssuers({
    institutionId: req.query.institutionId,
    status: req.query.status
  });

  return res.status(200).json({
    data: issuers
  });
}

export async function requestApproval(req, res) {
  const issuer = await requestIssuerApproval({
    authUser: req.auth,
    institutionId: req.body.institutionId
  });

  return res.status(201).json({
    data: issuer
  });
}

export async function approveRequest(req, res) {
  const result = await approveIssuerRequest({
    authUser: req.auth,
    issuerId: req.params.id,
    reviewNotes: req.body.reviewNotes
  });

  return res.status(200).json({
    data: result
  });
}

export async function rejectRequest(req, res) {
  const result = await rejectIssuerRequest({
    authUser: req.auth,
    issuerId: req.params.id,
    reviewNotes: req.body.reviewNotes
  });

  return res.status(200).json({
    data: result
  });
}

export async function remove(req, res) {
  const result = await removeIssuer({
    authUser: req.auth,
    issuerId: req.params.id,
    reviewNotes: req.body.reviewNotes
  });

  return res.status(200).json({
    data: result
  });
}
