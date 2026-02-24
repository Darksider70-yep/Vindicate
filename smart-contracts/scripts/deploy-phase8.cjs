const hre = require("hardhat");

async function main() {
  const [deployer, guardian, executor, treasury, moduleAdmin, anchorOracle] = await hre.ethers.getSigners();

  const coreContractAddress = process.env.CORE_CONTRACT_ADDRESS;
  if (!coreContractAddress) {
    throw new Error("CORE_CONTRACT_ADDRESS is required");
  }

  const GovernanceToken = await hre.ethers.getContractFactory("VindicateGovernanceToken");
  const governanceToken = await GovernanceToken.deploy(
    deployer.address,
    treasury.address,
    hre.ethers.parseEther("100000000")
  );
  await governanceToken.waitForDeployment();

  const Staking = await hre.ethers.getContractFactory("VindicateIssuerStaking");
  const staking = await Staking.deploy(
    deployer.address,
    deployer.address,
    guardian.address,
    deployer.address,
    await governanceToken.getAddress(),
    treasury.address,
    hre.ethers.parseEther("1000"),
    2 * 24 * 60 * 60,
    10
  );
  await staking.waitForDeployment();

  const Governor = await hre.ethers.getContractFactory("VindicateProtocolGovernor");
  const governor = await Governor.deploy(
    deployer.address,
    guardian.address,
    executor.address,
    await governanceToken.getAddress(),
    await staking.getAddress(),
    2,
    60,
    3 * 24 * 60 * 60,
    24 * 60 * 60,
    hre.ethers.parseEther("10000"),
    1000
  );
  await governor.waitForDeployment();

  const Registry = await hre.ethers.getContractFactory("VindicateProtocolRegistry");
  const registry = await Registry.deploy(
    await governor.getAddress(),
    moduleAdmin.address,
    coreContractAddress,
    "v1.0.0"
  );
  await registry.waitForDeployment();

  const MirrorModule = await hre.ethers.getContractFactory("EvmMirrorVerificationModule");
  const mirrorModule = await MirrorModule.deploy(
    deployer.address,
    coreContractAddress,
    "EvmMirrorVerificationModule",
    "1.0.0"
  );
  await mirrorModule.waitForDeployment();

  const AnchorModule = await hre.ethers.getContractFactory("ChainAgnosticAnchorModule");
  const anchorModule = await AnchorModule.deploy(deployer.address, anchorOracle.address);
  await anchorModule.waitForDeployment();

  const moduleIdMirror = hre.ethers.id("MODULE_EVM_MIRROR");
  const moduleIdAnchors = hre.ethers.id("MODULE_CROSS_CHAIN_ANCHOR");

  await (await registry.connect(moduleAdmin).registerModule(moduleIdMirror, await mirrorModule.getAddress(), true)).wait();
  await (await registry.connect(moduleAdmin).registerModule(moduleIdAnchors, await anchorModule.getAddress(), true)).wait();

  console.log("Governance token:", await governanceToken.getAddress());
  console.log("Staking:", await staking.getAddress());
  console.log("Governor:", await governor.getAddress());
  console.log("Protocol registry:", await registry.getAddress());
  console.log("Mirror module:", await mirrorModule.getAddress());
  console.log("Anchor module:", await anchorModule.getAddress());
  console.log("Module IDs:", moduleIdMirror, moduleIdAnchors);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });