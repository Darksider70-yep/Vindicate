import {
  registerInstitutionDid,
  registerStudentDid,
  resolveDid,
  verifyDidOwnership
} from "../services/did/did.service.js";

export async function registerStudent(req, res) {
  const didIdentity = await registerStudentDid({
    authUser: req.auth,
    walletAddress: req.body.walletAddress,
    serviceEndpoint: req.body.serviceEndpoint
  });

  return res.status(201).json({
    data: didIdentity
  });
}

export async function registerInstitution(req, res) {
  const didIdentity = await registerInstitutionDid({
    authUser: req.auth,
    institutionId: req.body.institutionId,
    controllerAddress: req.body.controllerAddress,
    serviceEndpoint: req.body.serviceEndpoint
  });

  return res.status(201).json({
    data: didIdentity
  });
}

export async function resolve(req, res) {
  const result = await resolveDid({
    did: req.query.did,
    verifyIpfs: req.query.verifyIpfs
  });

  return res.status(200).json({
    data: result
  });
}

export async function verifyOwnership(req, res) {
  const result = await verifyDidOwnership({
    did: req.body.did,
    challenge: req.body.challenge,
    signature: req.body.signature
  });

  return res.status(200).json({
    data: result
  });
}
