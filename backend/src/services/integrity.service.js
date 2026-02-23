function calculateIntegrityScore({
  blockchainHashMatchesDb,
  ipfsCidValid,
  ipfsChecksumMatchesDb,
  ipfsHashMatchesBlockchain,
  statusConsistency
}) {
  let score = 0;
  if (blockchainHashMatchesDb) score += 35;
  if (ipfsCidValid) score += 20;
  if (ipfsChecksumMatchesDb) score += 20;
  if (ipfsHashMatchesBlockchain) score += 20;
  if (statusConsistency) score += 5;
  return score;
}

function scoreGrade(score) {
  if (score >= 95) return "A";
  if (score >= 80) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function evaluateCredentialIntegrity({
  blockchainRecord,
  dbRecord,
  ipfsVerification
}) {
  const checks = {
    blockchainHashMatchesDb:
      Boolean(blockchainRecord && dbRecord) &&
      blockchainRecord.credentialHash.toLowerCase() === dbRecord.credentialHash.toLowerCase(),
    ipfsCidValid: Boolean(ipfsVerification?.cidMatches),
    ipfsChecksumMatchesDb:
      Boolean(ipfsVerification && dbRecord) &&
      ipfsVerification.fileChecksum.toLowerCase() === dbRecord.fileChecksum.toLowerCase(),
    ipfsHashMatchesBlockchain:
      Boolean(ipfsVerification && blockchainRecord) &&
      ipfsVerification.credentialHash.toLowerCase() === blockchainRecord.credentialHash.toLowerCase(),
    statusConsistency:
      Boolean(blockchainRecord && dbRecord) &&
      (dbRecord.status === "REVOKED" ? blockchainRecord.revoked : !blockchainRecord.revoked)
  };

  const score = calculateIntegrityScore(checks);
  const grade = scoreGrade(score);
  const violations = [];

  if (!checks.blockchainHashMatchesDb) {
    violations.push("BLOCKCHAIN_DB_HASH_MISMATCH");
  }
  if (!checks.ipfsCidValid) {
    violations.push("IPFS_CID_INVALID");
  }
  if (!checks.ipfsChecksumMatchesDb) {
    violations.push("IPFS_DB_CHECKSUM_MISMATCH");
  }
  if (!checks.ipfsHashMatchesBlockchain) {
    violations.push("IPFS_BLOCKCHAIN_HASH_MISMATCH");
  }
  if (!checks.statusConsistency) {
    violations.push("STATUS_MISMATCH");
  }

  return {
    score,
    grade,
    checks,
    violations,
    passed: violations.length === 0
  };
}
