import {
  createOfflineQrToken,
  generateSelectiveDisclosureProof,
  getVerifiableCredentialByHash,
  issueVerifiableCredential,
  revokeVerifiableCredential,
  verifyOfflineQrToken,
  verifySelectiveDisclosureProof,
  verifyVerifiableCredential
} from "../services/vc/vc.service.js";

export async function issue(req, res) {
  const result = await issueVerifiableCredential({
    authUser: req.auth,
    credentialHash: req.body.credentialHash,
    credentialSubject: req.body.credentialSubject,
    subjectDid: req.body.subjectDid,
    contexts: req.body.contexts,
    types: req.body.types,
    expirationDate: req.body.expirationDate
  });

  return res.status(201).json({
    data: result
  });
}

export async function getByHash(req, res) {
  const vc = await getVerifiableCredentialByHash({
    authUser: req.auth,
    vcHash: req.params.hash
  });

  return res.status(200).json({
    data: vc
  });
}

export async function verify(req, res) {
  const result = await verifyVerifiableCredential({
    vcHash: req.params.hash,
    requireChainAnchor: req.query.requireChainAnchor
  });

  return res.status(200).json({
    data: result
  });
}

export async function revoke(req, res) {
  const result = await revokeVerifiableCredential({
    authUser: req.auth,
    vcHash: req.params.hash
  });

  return res.status(200).json({
    data: result
  });
}

export async function createDisclosureProof(req, res) {
  const result = await generateSelectiveDisclosureProof({
    authUser: req.auth,
    vcId: req.params.id,
    attributeKey: req.body.attributeKey,
    challenge: req.body.challenge
  });

  return res.status(200).json({
    data: result
  });
}

export async function verifyDisclosureProof(req, res) {
  const result = await verifySelectiveDisclosureProof({
    proof: req.body.proof,
    proofSignature: req.body.proofSignature,
    challenge: req.body.challenge
  });

  return res.status(200).json({
    data: result
  });
}

export async function createOfflineToken(req, res) {
  const result = await createOfflineQrToken({
    authUser: req.auth,
    vcId: req.params.id,
    verifierChallenge: req.body.verifierChallenge
  });

  return res.status(201).json({
    data: result
  });
}

export async function verifyOfflineToken(req, res) {
  const result = await verifyOfflineQrToken({
    token: req.body.token,
    verifierChallenge: req.body.verifierChallenge
  });

  return res.status(200).json({
    data: result
  });
}
