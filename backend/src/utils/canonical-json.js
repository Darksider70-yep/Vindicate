import crypto from "node:crypto";

function sortValue(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object" && value.constructor === Object) {
    const sortedKeys = Object.keys(value).sort();
    const sortedObject = {};
    for (const key of sortedKeys) {
      sortedObject[key] = sortValue(value[key]);
    }
    return sortedObject;
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}

export function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function toBytes32Hash(value) {
  return `0x${sha256Hex(value)}`;
}
