const hre = require("hardhat");

async function main() {
  const [admin, governance, feeCollector, adjudicator, rewardOracle, treasuryOps] = await hre.ethers.getSigners();

  const tokenAddress = process.env.VGT_TOKEN_ADDRESS;
  const stakingAddress = process.env.STAKING_ADDRESS;

  if (!tokenAddress || !stakingAddress) {
    throw new Error("VGT_TOKEN_ADDRESS and STAKING_ADDRESS are required");
  }

  const Treasury = await hre.ethers.getContractFactory("VindicateTreasury");
  const treasury = await Treasury.deploy(
    admin.address,
    governance.address,
    feeCollector.address,
    {
      rewardsVault: treasuryOps.address,
      grantsVault: governance.address,
      insuranceVault: treasuryOps.address,
      operationsVault: admin.address,
      burnSink: "0x000000000000000000000000000000000000dEaD",
      rewardsBps: 3500,
      grantsBps: 2000,
      insuranceBps: 2000,
      operationsBps: 2000,
      burnBps: 500
    }
  );
  await treasury.waitForDeployment();

  const VestingVault = await hre.ethers.getContractFactory("VindicateVestingVault");
  const vestingVault = await VestingVault.deploy(admin.address, governance.address, tokenAddress);
  await vestingVault.waitForDeployment();

  const Rewards = await hre.ethers.getContractFactory("VindicateVerificationRewards");
  const rewards = await Rewards.deploy(admin.address, rewardOracle.address, tokenAddress);
  await rewards.waitForDeployment();

  const SlashingCourt = await hre.ethers.getContractFactory("VindicateSlashingCourt");
  const slashingCourt = await SlashingCourt.deploy(
    admin.address,
    adjudicator.address,
    tokenAddress,
    stakingAddress,
    await treasury.getAddress(),
    hre.ethers.parseEther("250"),
    3 * 24 * 60 * 60
  );
  await slashingCourt.waitForDeployment();

  const staking = await hre.ethers.getContractAt("VindicateIssuerStaking", stakingAddress);
  const slasherRole = await staking.SLASHER_ROLE();
  await (await staking.grantRole(slasherRole, await slashingCourt.getAddress())).wait();

  await (await rewards.setRewardRate(0, hre.ethers.parseEther("0.02"))).wait();
  await (await rewards.setRewardRate(1, hre.ethers.parseEther("50"))).wait();
  await (await rewards.setRewardRate(2, hre.ethers.parseEther("25"))).wait();
  await (await rewards.setRewardRate(3, hre.ethers.parseEther("100"))).wait();

  console.log("Treasury:", await treasury.getAddress());
  console.log("Vesting vault:", await vestingVault.getAddress());
  console.log("Rewards engine:", await rewards.getAddress());
  console.log("Slashing court:", await slashingCourt.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });