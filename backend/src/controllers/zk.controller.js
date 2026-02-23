import {
  createZkChallenge,
  getZkChallengeStatus,
  verifyZkProofSubmission
} from "../services/zk/zk-proof.service.js";

export async function createChallenge(req, res) {
  const result = await createZkChallenge({
    vcHash: req.body.vcHash,
    verifierDid: req.body.verifierDid
  });

  return res.status(201).json({
    data: result
  });
}

export async function verifyProof(req, res) {
  const result = await verifyZkProofSubmission({
    challengeId: req.body.challengeId,
    nullifierHash: req.body.nullifierHash,
    proof: req.body.proof,
    publicSignals: req.body.publicSignals,
    verificationMethod: req.body.verificationMethod,
    disclosedAttribute: req.body.disclosedAttribute
  });

  return res.status(200).json({
    data: result
  });
}

export async function getChallenge(req, res) {
  const result = await getZkChallengeStatus({
    challengeId: req.params.id
  });

  return res.status(200).json({
    data: result
  });
}
