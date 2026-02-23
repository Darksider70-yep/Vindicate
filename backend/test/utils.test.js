import test from "node:test";
import assert from "node:assert/strict";
import { stableStringify, toBytes32Hash } from "../src/utils/canonical-json.js";
import { withRetry } from "../src/utils/retry.js";

test("stableStringify is deterministic regardless of key order", () => {
  const first = { b: 1, a: { d: 4, c: 3 } };
  const second = { a: { c: 3, d: 4 }, b: 1 };

  const firstSerialized = stableStringify(first);
  const secondSerialized = stableStringify(second);

  assert.equal(firstSerialized, secondSerialized);
  assert.equal(toBytes32Hash(firstSerialized), toBytes32Hash(secondSerialized));
});

test("withRetry retries and eventually succeeds", async () => {
  let attempts = 0;

  const result = await withRetry(
    async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("transient");
      }
      return "ok";
    },
    {
      retries: 3,
      delayMs: 1
    }
  );

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});
