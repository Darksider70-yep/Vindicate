import { findStudentByAddress } from "../services/student.service.js";

export async function getStudentByAddress(req, res) {
  const student = await findStudentByAddress(req.params.address);
  return res.status(200).json({
    data: student
  });
}
