import {
  blacklistCredentialHash,
  emergencyRevokeCredential,
  getCredentialByHash,
  getCredentialQr,
  issueCredential,
  revokeCredential
} from "../services/credential.service.js";
import { signVerificationResponse } from "../services/qr.service.js";

export async function issue(req, res) {
  const result = await issueCredential({
    authUser: req.auth,
    studentAddress: req.body.studentAddress,
    institutionId: req.body.institutionId,
    fileName: req.body.fileName,
    mimeType: req.body.mimeType,
    fileBase64: req.body.fileBase64,
    metadata: req.body.metadata,
    encrypt: req.body.encrypt
  });

  return res.status(201).json({
    data: result
  });
}

export async function revoke(req, res) {
  const result = await revokeCredential({
    authUser: req.auth,
    credentialHash: req.body.credentialHash,
    reason: req.body.reason
  });

  return res.status(200).json({
    data: result
  });
}

export async function emergencyRevoke(req, res) {
  const result = await emergencyRevokeCredential({
    authUser: req.auth,
    credentialHash: req.body.credentialHash,
    reason: req.body.reason
  });

  return res.status(200).json({
    data: result
  });
}

export async function getByHash(req, res) {
  const result = await getCredentialByHash(req.params.hash);
  return res.status(200).json({
    data: signVerificationResponse(result)
  });
}

export async function getQr(req, res) {
  const result = await getCredentialQr(req.params.hash);
  return res.status(200).json({
    data: result
  });
}

export async function blacklistHash(req, res) {
  const result = await blacklistCredentialHash({
    actorUserId: req.auth.sub,
    credentialHash: req.body.credentialHash,
    reason: req.body.reason
  });

  return res.status(201).json({
    data: result
  });
}
