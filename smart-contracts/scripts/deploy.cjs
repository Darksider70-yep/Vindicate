const hre = require("hardhat");

async function main() {
  // Get the contract factory
  const SkillProof = await hre.ethers.getContractFactory("SkillProof");

  // Deploy the contract
  const skillProof = await SkillProof.deploy();

  // Wait until it's mined
  await skillProof.waitForDeployment();

  // Get deployed address
  console.log("SkillProof deployed to:", await skillProof.getAddress());
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
