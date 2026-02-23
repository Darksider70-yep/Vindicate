import {
  approveInstitutionOnboarding,
  listInstitutions,
  rejectInstitutionOnboarding,
  requestInstitutionOnboarding
} from "../services/institution.service.js";

export async function list(req, res) {
  const institutions = await listInstitutions({
    status: req.query.status
  });
  return res.status(200).json({
    data: institutions
  });
}

export async function requestOnboarding(req, res) {
  const institution = await requestInstitutionOnboarding({
    authUser: req.auth,
    name: req.body.name,
    code: req.body.code
  });

  return res.status(201).json({
    data: institution
  });
}

export async function approveOnboarding(req, res) {
  const result = await approveInstitutionOnboarding({
    authUser: req.auth,
    institutionId: req.params.id,
    adminWallet: req.body.adminWallet,
    reviewNotes: req.body.reviewNotes
  });

  return res.status(200).json({
    data: result
  });
}

export async function rejectOnboarding(req, res) {
  const result = await rejectInstitutionOnboarding({
    authUser: req.auth,
    institutionId: req.params.id,
    reviewNotes: req.body.reviewNotes
  });

  return res.status(200).json({
    data: result
  });
}
