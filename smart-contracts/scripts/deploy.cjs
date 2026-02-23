const hre = require("hardhat");

async function main() {
  const [defaultAdmin, institutionAdmin] = await hre.ethers.getSigners();

  const SkillProof = await hre.ethers.getContractFactory("SkillProof");
  const Proxy = await hre.ethers.getContractFactory("SkillProofProxy");

  const implementation = await SkillProof.deploy();
  await implementation.waitForDeployment();

  const initData = SkillProof.interface.encodeFunctionData("initialize", [
    defaultAdmin.address,
    institutionAdmin.address
  ]);

  const proxy = await Proxy.deploy(await implementation.getAddress(), initData);
  await proxy.waitForDeployment();

  const skillProof = await hre.ethers.getContractAt("SkillProof", await proxy.getAddress());
  await (await skillProof.connect(institutionAdmin).approveIssuer(defaultAdmin.address)).wait();

  console.log("SkillProof implementation:", await implementation.getAddress());
  console.log("SkillProof proxy:", await proxy.getAddress());
  console.log("Default admin:", defaultAdmin.address);
  console.log("Institution admin:", institutionAdmin.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
