import {
  getCredentialByHash,
  issueCredential,
  revokeCredential
} from "../services/credential.service.js";

export async function issue(req, res) {
  const result = await issueCredential({
    authUser: req.auth,
    studentAddress: req.body.studentAddress,
    institutionId: req.body.institutionId,
    credential: req.body.credential,
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

export async function getByHash(req, res) {
  const result = await getCredentialByHash(req.params.hash);
  return res.status(200).json({
    data: result
  });
}
