import {
  approveWalletRotation,
  assignUserRole,
  listWalletRotationRequests,
  rejectWalletRotation,
  requestWalletRotation
} from "../services/governance.service.js";

export async function assignRole(req, res) {
  const user = await assignUserRole({
    authUser: req.auth,
    walletAddress: req.body.walletAddress,
    role: req.body.role,
    institutionId: req.body.institutionId
  });

  return res.status(200).json({
    data: user
  });
}

export async function requestRotation(req, res) {
  const request = await requestWalletRotation({
    authUser: req.auth,
    newWalletAddress: req.body.newWalletAddress,
    reason: req.body.reason
  });

  return res.status(201).json({
    data: request
  });
}

export async function approveRotation(req, res) {
  const result = await approveWalletRotation({
    authUser: req.auth,
    requestId: req.params.id,
    reviewNote: req.body.reviewNote,
    proofMessage: req.body.proofMessage,
    proofSignature: req.body.proofSignature
  });

  return res.status(200).json({
    data: result
  });
}

export async function rejectRotation(req, res) {
  const result = await rejectWalletRotation({
    authUser: req.auth,
    requestId: req.params.id,
    reviewNote: req.body.reviewNote
  });

  return res.status(200).json({
    data: result
  });
}

export async function listRotations(req, res) {
  const requests = await listWalletRotationRequests({
    status: req.query.status
  });

  return res.status(200).json({
    data: requests
  });
}
