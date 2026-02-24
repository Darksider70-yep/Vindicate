import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { ethers } from "ethers";
import { env } from "../../src/config/env.js";

function parseArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((entry) => entry.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

async function readCursor(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Number(parsed.lastSyncedBlock ?? 0);
  } catch {
    return 0;
  }
}

async function main() {
  const cursorFile = parseArg("cursor-file") ?? path.resolve(process.cwd(), ".dist/dr/event-sync-cursor.json");
  const outFile = parseArg("output") ?? path.resolve(process.cwd(), ".dist/dr/contract-events.ndjson");
  const chunkSize = Number(parseArg("chunk-size") ?? process.env.DR_BLOCK_CHUNK_SIZE ?? 1000);

  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error("chunk-size must be a positive integer");
  }

  const artifactPath = new URL("../../contracts/SkillProof.json", import.meta.url);
  const artifactRaw = await fs.readFile(artifactPath, "utf8");
  const artifact = JSON.parse(artifactRaw);
  const abi = Array.isArray(artifact) ? artifact : artifact.abi;
  if (!Array.isArray(abi)) {
    throw new Error("Invalid ABI in backend/contracts/SkillProof.json");
  }

  const provider = new ethers.JsonRpcProvider(env.RPC_URLS[0], env.CHAIN_ID);
  const contract = new ethers.Contract(env.CONTRACT_ADDRESS, abi, provider);
  const iface = contract.interface;

  const latestBlock = await provider.getBlockNumber();
  const fromBlock = (await readCursor(cursorFile)) + 1;

  if (fromBlock > latestBlock) {
    console.log(`No events to sync. latestBlock=${latestBlock}`);
    return;
  }

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.mkdir(path.dirname(cursorFile), { recursive: true });

  const eventTopics = [
    iface.getEvent("CredentialIssued").topicHash,
    iface.getEvent("CredentialRevoked").topicHash,
    iface.getEvent("IssuerApproved").topicHash,
    iface.getEvent("IssuerRemoved").topicHash
  ];

  for (let start = fromBlock; start <= latestBlock; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, latestBlock);
    const logs = await provider.getLogs({
      fromBlock: start,
      toBlock: end,
      address: env.CONTRACT_ADDRESS,
      topics: [eventTopics]
    });

    const lines = logs.map((log) => {
      const parsed = iface.parseLog(log);
      const serializedArgs = Object.fromEntries(
        Object.entries(parsed.args.toObject()).map(([key, value]) => [
          key,
          typeof value === "bigint" ? value.toString() : value
        ])
      );

      return JSON.stringify({
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.index,
        eventName: parsed.name,
        args: serializedArgs,
        syncedAt: new Date().toISOString()
      });
    });

    if (lines.length > 0) {
      await fs.appendFile(outFile, `${lines.join("\n")}\n`, "utf8");
    }

    await fs.writeFile(
      cursorFile,
      `${JSON.stringify({ lastSyncedBlock: end, updatedAt: new Date().toISOString() }, null, 2)}\n`,
      "utf8"
    );

    console.log(`Resynced blocks ${start}-${end} with ${lines.length} events`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});