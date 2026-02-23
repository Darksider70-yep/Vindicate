import { ethers } from "ethers";
import { prisma } from "../db/prisma.js";
import { AppError } from "../utils/app-error.js";

function normalizeAddress(address) {
  if (!ethers.isAddress(address)) {
    throw new AppError(400, "INVALID_ADDRESS", "Invalid wallet address");
  }
  return ethers.getAddress(address).toLowerCase();
}

export async function findStudentByAddress(studentAddress) {
  const normalizedAddress = normalizeAddress(studentAddress);

  const student = await prisma.user.findUnique({
    where: { walletAddress: normalizedAddress },
    include: {
      institution: true,
      studentCredentials: {
        include: {
          issuer: true,
          institution: true,
          revocation: true
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!student) {
    throw new AppError(404, "STUDENT_NOT_FOUND", "Student not found");
  }

  return student;
}
