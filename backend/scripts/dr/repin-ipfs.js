import process from "node:process";
import { prisma } from "../../src/db/prisma.js";
import { ipfsService } from "../../src/services/ipfs.service.js";

function parseArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((entry) => entry.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

async function main() {
  const limitArg = parseArg("limit");
  const limit = limitArg ? Number(limitArg) : 0;
  const dryRun = process.argv.includes("--dry-run");

  if (limitArg && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error("--limit must be a positive integer");
  }

  const credentials = await prisma.credential.findMany({
    select: {
      id: true,
      credentialHash: true,
      ipfsCid: true
    },
    orderBy: {
      createdAt: "asc"
    },
    ...(limit > 0 ? { take: limit } : {})
  });

  let success = 0;
  let failed = 0;
  const failures = [];

  for (const credential of credentials) {
    try {
      if (!dryRun) {
        await ipfsService.pinCID(credential.ipfsCid, { bestEffort: false });
      }
      success += 1;
    } catch (error) {
      failed += 1;
      failures.push({
        credentialId: credential.id,
        credentialHash: credential.credentialHash,
        cid: credential.ipfsCid,
        error: error.message
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        checked: credentials.length,
        success,
        failed,
        dryRun,
        failures
      },
      null,
      2
    )
  );

  if (failed > 0) {
    process.exitCode = 2;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });