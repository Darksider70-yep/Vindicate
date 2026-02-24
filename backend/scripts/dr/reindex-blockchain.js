import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { ethers } from "ethers";
import { env } from "../../src/config/env.js";

function parseArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((entry) => entry.startsWith(prefix));
  if (!arg) return undefined;
  return arg.slice(prefix.length);
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function getAbi() {
  const artifactPath = new URL("../../contracts/SkillProof.json", import.meta.url);
  return fs.readFile(artifactPath, "utf8").then((raw) => {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed.abi)) {
      return parsed.abi;
    }
    throw new Error("Invalid ABI in backend/contracts/SkillProof.json");
  });
}

async function main() {
  const cursorFile = parseArg("cursor-file") ?? path.resolve(process.cwd(), ".dist/dr/reindex-cursor.json");
  const outputFile = parseArg("output") ?? path.resolve(process.cwd(), ".dist/dr/chain-index.json");
  const chunkSize = Number(parseArg("chunk-size") ?? process.env.DR_BLOCK_CHUNK_SIZE ?? 2000);
  const fromBlockArg = parseArg("from-block");

  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error("chunk-size must be a positive integer");
  }

  const provider = new ethers.JsonRpcProvider(env.RPC_URLS[0], env.CHAIN_ID);
  const abi = await getAbi();
  const contract = new ethers.Contract(env.CONTRACT_ADDRESS, abi, provider);

  const cursor = await readJson(cursorFile, { lastIndexedBlock: 0 });
  const latestBlock = await provider.getBlockNumber();
  const fromBlock = fromBlockArg ? Number(fromBlockArg) : Number(cursor.lastIndexedBlock) + 1;

  if (!Number.isInteger(fromBlock) || fromBlock < 0) {
    throw new Error("from-block must be a non-negative integer");
  }

  const indexData = await readJson(outputFile, {
    network: env.CHAIN_ID,
    contractAddress: env.CONTRACT_ADDRESS,
    generatedAt: null,
    latestBlock: 0,
    credentials: {},
    eventLog: []
  });

  if (fromBlock > latestBlock) {
    console.log(`No new blocks to index. fromBlock=${fromBlock}, latestBlock=${latestBlock}`);
    return;
  }

  for (let start = fromBlock; start <= latestBlock; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, latestBlock);

    const [issuedEvents, revokedEvents] = await Promise.all([
      contract.queryFilter(contract.filters.CredentialIssued(), start, end),
      contract.queryFilter(contract.filters.CredentialRevoked(), start, end)
    ]);

    for (const event of issuedEvents) {
      const args = event.args;
      if (!args) continue;

      const credentialId = args.credentialId.toString();
      indexData.credentials[credentialId] = {
        credentialId,
        credentialHash: args.credentialHash.toLowerCase(),
        student: args.student.toLowerCase(),
        issuer: args.issuer.toLowerCase(),
        issuedAt: Number(args.issuedAt),
        revoked: false,
        revokedAt: null,
        issuedTxHash: event.transactionHash,
        revokedTxHash: null,
        lastUpdatedBlock: event.blockNumber
      };

      indexData.eventLog.push({
        event: "CredentialIssued",
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        credentialId
      });
    }

    for (const event of revokedEvents) {
      const args = event.args;
      if (!args) continue;

      const credentialId = args.credentialId.toString();
      const existing = indexData.credentials[credentialId] ?? { credentialId };
      indexData.credentials[credentialId] = {
        ...existing,
        revoked: true,
        revokedAt: Number(args.revokedAt),
        revokedTxHash: event.transactionHash,
        lastUpdatedBlock: event.blockNumber
      };

      indexData.eventLog.push({
        event: "CredentialRevoked",
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        credentialId
      });
    }

    console.log(`Indexed blocks ${start}-${end} (issued=${issuedEvents.length}, revoked=${revokedEvents.length})`);
  }

  indexData.generatedAt = new Date().toISOString();
  indexData.latestBlock = latestBlock;

  await ensureDir(outputFile);
  await ensureDir(cursorFile);
  await fs.writeFile(outputFile, `${JSON.stringify(indexData, null, 2)}\n`, "utf8");
  await fs.writeFile(cursorFile, `${JSON.stringify({ lastIndexedBlock: latestBlock }, null, 2)}\n`, "utf8");

  console.log(`Blockchain index rebuilt at ${outputFile} (latestBlock=${latestBlock})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});