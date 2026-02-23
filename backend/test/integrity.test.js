import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCredentialIntegrity } from "../src/services/integrity.service.js";

test("evaluateCredentialIntegrity returns pass on fully matching records", () => {
  const result = evaluateCredentialIntegrity({
    blockchainRecord: {
      credentialHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      revoked: false
    },
    dbRecord: {
      credentialHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      fileChecksum: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      status: "ACTIVE"
    },
    ipfsVerification: {
      cidMatches: true,
      fileChecksum: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      credentialHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }
  });

  assert.equal(result.passed, true);
  assert.equal(result.grade, "A");
});

test("evaluateCredentialIntegrity returns failure on mismatch", () => {
  const result = evaluateCredentialIntegrity({
    blockchainRecord: {
      credentialHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      revoked: true
    },
    dbRecord: {
      credentialHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      fileChecksum: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      status: "ACTIVE"
    },
    ipfsVerification: {
      cidMatches: false,
      fileChecksum: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      credentialHash: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
    }
  });

  assert.equal(result.passed, false);
  assert.ok(result.violations.length >= 3);
});
