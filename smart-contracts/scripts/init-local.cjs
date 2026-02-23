const hre = require("hardhat");
async function main() {
  const [admin, institutionAdmin] = await hre.ethers.getSigners();
  const c = await hre.ethers.getContractAt("SkillProof", process.env.CONTRACT_ADDRESS);
  await (await c.connect(admin).initialize(admin.address, institutionAdmin.address)).wait();
  await (await c.connect(institutionAdmin).approveIssuer(admin.address)).wait();
  console.log("initialized + issuer approved:", admin.address);
}
main().catch((e)=>{ console.error(e); process.exit(1); });
