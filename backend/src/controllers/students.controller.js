import { findStudentByAddress } from "../services/student.service.js";
import { ROLES } from "../constants/roles.js";
import { AppError } from "../utils/app-error.js";

export async function getStudentByAddress(req, res) {
  if (
    req.auth.role === ROLES.STUDENT &&
    req.auth.walletAddress.toLowerCase() !== req.params.address.toLowerCase()
  ) {
    throw new AppError(403, "FORBIDDEN", "Students can only view their own profile");
  }

  const student = await findStudentByAddress(req.params.address);
  return res.status(200).json({
    data: student
  });
}
