import process from "node:process";
import { prisma } from "../../src/db/prisma.js";

function getArg(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

async function main() {
  const credentialHash = getArg("credential-hash");
  if (!credentialHash) {
    throw new Error("--credential-hash=<hash> is required");
  }

  const normalizedHash = credentialHash.toLowerCase();
  const credential = await prisma.credential.findUnique({
    where: { credentialHash: normalizedHash },
    include: { credentialKey: true }
  });

  if (!credential) {
    throw new Error("Credential not found");
  }

  if (!credential.credentialKey) {
    console.log("Credential key already absent; nothing to redact");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.credentialKey.delete({
      where: { credentialId: credential.id }
    });

    await tx.credential.update({
      where: { id: credential.id },
      data: {
        metadata: {
          ...(credential.metadata ?? {}),
          gdprErasure: {
            performedAt: new Date().toISOString(),
            method: "encryption_key_shredding"
          }
        }
      }
    });
  });

  console.log(`Redacted encryption key for ${normalizedHash}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });