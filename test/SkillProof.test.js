const { expect } = require("chai");

describe("SkillProof", function () {
  it("Should issue and verify a credential", async function () {
    const [issuer, user] = await ethers.getSigners();
    const SkillProof = await ethers.getContractFactory("SkillProof");
    const skillProof = await SkillProof.deploy();

    await skillProof.issueCredential(user.address, "hash123");
    const credential = await skillProof.verifyCredential(1);

    expect(credential.credentialHash).to.equal("hash123");
    expect(credential.owner).to.equal(user.address);
  });
});
