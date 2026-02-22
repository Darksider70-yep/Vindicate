import { prisma } from "../db/prisma.js";

export async function listIssuers({ institutionId, status }) {
  return prisma.issuer.findMany({
    where: {
      institutionId: institutionId || undefined,
      status: status || undefined
    },
    include: {
      user: true,
      institution: true,
      approvedBy: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}
