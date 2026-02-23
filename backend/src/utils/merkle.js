import { ethers } from "ethers";
import { AppError } from "./app-error.js";
import { stableStringify } from "./canonical-json.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function ensureBytes32Hex(value, label) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new AppError(400, "INVALID_HASH", `${label} must be a bytes32 hex string`);
  }
  return value.toLowerCase();
}

function hashUtf8(value) {
  return ethers.keccak256(ethers.toUtf8Bytes(value));
}

function hashPair(left, right) {
  const leftHash = ensureBytes32Hex(left, "left hash");
  const rightHash = ensureBytes32Hex(right, "right hash");
  return ethers.keccak256(ethers.concat([leftHash, rightHash]));
}

function normalizeAttributes(attributes) {
  if (!isPlainObject(attributes)) {
    throw new AppError(400, "INVALID_ATTRIBUTES", "attributes must be a JSON object");
  }

  const entries = Object.entries(attributes)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    throw new AppError(400, "INVALID_ATTRIBUTES", "attributes must contain at least one value");
  }

  return entries;
}

export function hashAttributeLeaf(key, value) {
  if (!key || typeof key !== "string") {
    throw new AppError(400, "INVALID_ATTRIBUTE_KEY", "attribute key must be a non-empty string");
  }

  const serialized = `${key}:${stableStringify(value)}`;
  return hashUtf8(serialized).toLowerCase();
}

export function buildCredentialMerkleTree(attributes) {
  const normalizedEntries = normalizeAttributes(attributes);

  const leaves = normalizedEntries.map(([key, value], index) => ({
    key,
    value,
    index,
    hash: hashAttributeLeaf(key, value)
  }));

  const levels = [leaves.map((leaf) => leaf.hash)];
  while (levels[levels.length - 1].length > 1) {
    const previousLevel = levels[levels.length - 1];
    const nextLevel = [];

    for (let index = 0; index < previousLevel.length; index += 2) {
      const left = previousLevel[index];
      const right = previousLevel[index + 1] ?? left;
      nextLevel.push(hashPair(left, right));
    }

    levels.push(nextLevel);
  }

  const root = levels[levels.length - 1][0];
  const leavesByKey = Object.fromEntries(leaves.map((leaf) => [leaf.key, leaf.hash]));
  const orderedKeys = leaves.map((leaf) => leaf.key);

  return {
    root: root.toLowerCase(),
    orderedKeys,
    leavesByKey,
    leaves
  };
}

export function createMerkleProof(tree, attributeKey) {
  if (!tree || !Array.isArray(tree.leaves) || !Array.isArray(tree.orderedKeys) || !tree.root) {
    throw new AppError(500, "MERKLE_TREE_INVALID", "Merkle tree shape is invalid");
  }

  const leaf = tree.leaves.find((entry) => entry.key === attributeKey);
  if (!leaf) {
    throw new AppError(404, "ATTRIBUTE_NOT_FOUND", "Attribute key not found in credential");
  }

  const levels = [tree.leaves.map((entry) => entry.hash)];
  while (levels[levels.length - 1].length > 1) {
    const previousLevel = levels[levels.length - 1];
    const nextLevel = [];
    for (let index = 0; index < previousLevel.length; index += 2) {
      const left = previousLevel[index];
      const right = previousLevel[index + 1] ?? left;
      nextLevel.push(hashPair(left, right));
    }
    levels.push(nextLevel);
  }

  const siblings = [];
  let currentIndex = leaf.index;
  for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex += 1) {
    const level = levels[levelIndex];
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
    const siblingHash = level[siblingIndex] ?? level[currentIndex];

    siblings.push({
      hash: siblingHash.toLowerCase(),
      isLeft: isRightNode
    });

    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    attributeKey: leaf.key,
    leafHash: leaf.hash.toLowerCase(),
    root: tree.root.toLowerCase(),
    siblings
  };
}

export function verifyMerkleProof({ leafHash, siblings, root }) {
  const normalizedRoot = ensureBytes32Hex(root, "merkle root");
  const normalizedLeaf = ensureBytes32Hex(leafHash, "leaf hash");
  if (!Array.isArray(siblings) || siblings.length === 0) {
    return normalizedLeaf === normalizedRoot;
  }

  let currentHash = normalizedLeaf;
  for (const sibling of siblings) {
    if (!sibling || typeof sibling !== "object") {
      throw new AppError(400, "INVALID_MERKLE_PROOF", "Merkle sibling entry is invalid");
    }
    const siblingHash = ensureBytes32Hex(sibling.hash, "sibling hash");
    const isLeft = Boolean(sibling.isLeft);
    currentHash = isLeft ? hashPair(siblingHash, currentHash) : hashPair(currentHash, siblingHash);
  }

  return currentHash.toLowerCase() === normalizedRoot.toLowerCase();
}
