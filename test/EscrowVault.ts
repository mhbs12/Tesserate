import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();
const ONE_ETHER = 10n ** 18n;
const RAY = 10n ** 27n;

async function deploySuite() {
  const [deployer, employer, employee, other] = await ethers.getSigners();

  const nft = await ethers.deployContract("GuaranteeNFT", [deployer.address]);
  const yieldRightNft = await ethers.deployContract("YieldRightNFT", [deployer.address]);
  const governanceToken = await ethers.deployContract("TesserateGovernanceToken", [
    deployer.address,
    deployer.address,
  ]);
  const paymentToken = await ethers.deployContract("MockERC20", ["Mock USD", "mUSD"]);
  const paymentTokenFeed = await ethers.deployContract("MockAggregatorV3", [8, 1n * 10n ** 8n]);
  const priceOracle = await ethers.deployContract("ChainlinkPriceOracle", [deployer.address, 3600n]);
  const aavePool = await ethers.deployContract("MockAavePool");
  const staking = await ethers.deployContract("TGTStaking", [
    await governanceToken.getAddress(),
    await paymentToken.getAddress(),
    deployer.address,
  ]);

  await priceOracle.connect(deployer).setPriceFeed(await paymentToken.getAddress(), await paymentTokenFeed.getAddress());

  const vault = await ethers.deployContract("EscrowVault", [
    await nft.getAddress(),
    await yieldRightNft.getAddress(),
    await priceOracle.getAddress(),
    await aavePool.getAddress(),
    await paymentToken.getAddress(),
    await staking.getAddress(),
  ]);

  await nft.connect(deployer).setEscrowVault(await vault.getAddress());
  await yieldRightNft.connect(deployer).setEscrowVault(await vault.getAddress());

  return {
    deployer,
    employer,
    employee,
    other,
    nft,
    yieldRightNft,
    governanceToken,
    paymentToken,
    paymentTokenFeed,
    priceOracle,
    aavePool,
    staking,
    vault,
  };
}

async function createServiceAndYield(params: {
  employer: any;
  employee: any;
  paymentToken: any;
  aavePool: any;
  vault: any;
  amount: bigint;
  yieldAmount: bigint;
  lockDays: bigint;
}) {
  const { employer, employee, paymentToken, aavePool, vault, amount, yieldAmount, lockDays } = params;

  await paymentToken.mint(employer.address, amount);
  await paymentToken.connect(employer).approve(await vault.getAddress(), amount);
  await vault.connect(employer).deposit(employee.address, await paymentToken.getAddress(), amount, lockDays);

  await aavePool.accrueYield(await paymentToken.getAddress(), yieldAmount);
  await aavePool.setReserveNormalizedIncome(
    await paymentToken.getAddress(),
    (RAY * (amount + yieldAmount)) / amount,
  );

  await ethers.provider.send("evm_increaseTime", [Number(lockDays) * 24 * 60 * 60]);
  await ethers.provider.send("evm_mine", []);
}

describe("EscrowVault", function () {
  it("enforces fixed governance token supply of 1,000,000 TGT", async function () {
    const { governanceToken, deployer } = await deploySuite();
    const maxSupply = 1_000_000n * ONE_ETHER;

    expect(await governanceToken.totalSupply()).to.equal(maxSupply);
    expect(await governanceToken.balanceOf(deployer.address)).to.equal(maxSupply);
  });

  it("applies default 10% fee when claimer has less than 1000 TGT", async function () {
    const { deployer, employer, employee, governanceToken, paymentToken, aavePool, staking, vault } =
      await deploySuite();
    const amount = 1_000n * ONE_ETHER;
    const yieldAmount = 100n * ONE_ETHER;

    await vault.connect(deployer).setGovernanceToken(await governanceToken.getAddress());
    await createServiceAndYield({
      employer,
      employee,
      paymentToken,
      aavePool,
      vault,
      amount,
      yieldAmount,
      lockDays: 1n,
    });

    const expectedFee = 10n * ONE_ETHER;
    const expectedNet = 90n * ONE_ETHER;

    expect(await vault.getFeeBpsFor(employer.address)).to.equal(1000n);
    expect(await vault.getClaimableYield(0n)).to.equal(expectedNet);

    const employerBalanceBefore = await paymentToken.balanceOf(employer.address);
    const platformBalanceBefore = await paymentToken.balanceOf(deployer.address);
    const stakingRewardsBefore = await paymentToken.balanceOf(await staking.getAddress());

    await vault.connect(employer).claimYield(0n);

    const employerBalanceAfter = await paymentToken.balanceOf(employer.address);
    const platformBalanceAfter = await paymentToken.balanceOf(deployer.address);
    const stakingRewardsAfter = await paymentToken.balanceOf(await staking.getAddress());
    expect(employerBalanceAfter - employerBalanceBefore).to.equal(expectedNet);
    expect(platformBalanceAfter - platformBalanceBefore).to.equal(expectedFee);
    expect(stakingRewardsAfter - stakingRewardsBefore).to.equal(0n);
  });

  it("exposes deposit USD value for frontend preview", async function () {
    const { paymentToken, vault } = await deploySuite();

    expect(await vault.getDepositUsdValue(await paymentToken.getAddress(), 2n * ONE_ETHER)).to.equal(
      2n * ONE_ETHER,
    );
  });

  it("rejects deposits that are not greater than 1 USD", async function () {
    const { deployer, employer, employee, governanceToken, paymentToken, paymentTokenFeed, vault } =
      await deploySuite();
    const amount = 2n * ONE_ETHER;

    await paymentTokenFeed.setAnswer(50_000_000n); // 0.50 USD per token, so 2 tokens == 1 USD.
    await vault.connect(deployer).setGovernanceToken(await governanceToken.getAddress());
    await paymentToken.mint(employer.address, amount);
    await paymentToken.connect(employer).approve(await vault.getAddress(), amount);

    await expect(
      vault.connect(employer).deposit(employee.address, await paymentToken.getAddress(), amount, 1n),
    ).to.be.revertedWith("Deposit must be greater than 1 USD");
  });

  it("applies fee tiers based on TGT balance at claim time", async function () {
    const scenarios = [
      { tgt: 1_000n, feeBps: 900n },
      { tgt: 2_000n, feeBps: 800n },
      { tgt: 4_000n, feeBps: 700n },
      { tgt: 10_000n, feeBps: 500n },
      { tgt: 15_000n, feeBps: 500n },
    ];

    for (const scenario of scenarios) {
      const { deployer, employer, employee, governanceToken, paymentToken, aavePool, staking, vault } =
        await deploySuite();

      const amount = 1_000n * ONE_ETHER;
      const yieldAmount = 100n * ONE_ETHER;

      await vault.connect(deployer).setGovernanceToken(await governanceToken.getAddress());
      await governanceToken.connect(deployer).transfer(employer.address, scenario.tgt * ONE_ETHER);

      await createServiceAndYield({
        employer,
        employee,
        paymentToken,
        aavePool,
        vault,
        amount,
        yieldAmount,
        lockDays: 1n,
      });

      const expectedFee = (yieldAmount * scenario.feeBps) / 10_000n;
      const expectedNet = yieldAmount - expectedFee;

      expect(await vault.getFeeBpsFor(employer.address)).to.equal(scenario.feeBps);
      expect(await vault.getClaimableYield(0n)).to.equal(expectedNet);

      const employerBalanceBefore = await paymentToken.balanceOf(employer.address);
      const platformBalanceBefore = await paymentToken.balanceOf(deployer.address);
      const stakingRewardsBefore = await paymentToken.balanceOf(await staking.getAddress());
      await vault.connect(employer).claimYield(0n);
      const employerBalanceAfter = await paymentToken.balanceOf(employer.address);
      const platformBalanceAfter = await paymentToken.balanceOf(deployer.address);
      const stakingRewardsAfter = await paymentToken.balanceOf(await staking.getAddress());

      expect(employerBalanceAfter - employerBalanceBefore).to.equal(expectedNet);
      expect(platformBalanceAfter - platformBalanceBefore).to.equal(expectedFee);
      expect(stakingRewardsAfter - stakingRewardsBefore).to.equal(0n);
    }
  });

  it("counts staked TGT toward fee discounts", async function () {
    const { deployer, employer, employee, governanceToken, paymentToken, aavePool, staking, vault } =
      await deploySuite();
    const amount = 1_000n * ONE_ETHER;
    const yieldAmount = 100n * ONE_ETHER;
    const stakedTgt = 1_000n * ONE_ETHER;

    await vault.connect(deployer).setGovernanceToken(await governanceToken.getAddress());
    await governanceToken.connect(deployer).transfer(employer.address, stakedTgt);
    await governanceToken.connect(employer).approve(await staking.getAddress(), stakedTgt);
    await staking.connect(employer).stake(stakedTgt);

    await createServiceAndYield({
      employer,
      employee,
      paymentToken,
      aavePool,
      vault,
      amount,
      yieldAmount,
      lockDays: 1n,
    });

    const expectedFee = (yieldAmount * 900n) / 10_000n;
    const expectedPlatformFee = expectedFee / 2n;
    const expectedStakingRewards = expectedFee / 2n;
    const expectedNet = yieldAmount - expectedFee;

    expect(await governanceToken.balanceOf(employer.address)).to.equal(0n);
    expect(await staking.stakedBalance(employer.address)).to.equal(stakedTgt);
    expect(await vault.getFeeBpsFor(employer.address)).to.equal(900n);
    expect(await vault.getClaimableYield(0n)).to.equal(expectedNet);

    const employerBalanceBefore = await paymentToken.balanceOf(employer.address);
    const platformBalanceBefore = await paymentToken.balanceOf(deployer.address);
    await vault.connect(employer).claimYield(0n);
    const employerBalanceAfter = await paymentToken.balanceOf(employer.address);
    const platformBalanceAfter = await paymentToken.balanceOf(deployer.address);

    expect(employerBalanceAfter - employerBalanceBefore).to.equal(expectedNet);
    expect(platformBalanceAfter - platformBalanceBefore).to.equal(expectedPlatformFee);
    expect(await staking.earned(employer.address)).to.equal(expectedStakingRewards);
  });

  it("splits fees between platform recipient and USDC staking rewards", async function () {
    const { deployer, employer, employee, other, governanceToken, paymentToken, aavePool, staking, vault } =
      await deploySuite();
    const amount = 1_000n * ONE_ETHER;
    const yieldAmount = 100n * ONE_ETHER;

    await vault.connect(deployer).setGovernanceToken(await governanceToken.getAddress());
    await vault.connect(deployer).setPlatformFeeRecipient(other.address);
    await governanceToken.connect(deployer).transfer(employee.address, 100n * ONE_ETHER);
    await governanceToken.connect(employee).approve(await staking.getAddress(), 100n * ONE_ETHER);
    await staking.connect(employee).stake(100n * ONE_ETHER);

    await createServiceAndYield({
      employer,
      employee,
      paymentToken,
      aavePool,
      vault,
      amount,
      yieldAmount,
      lockDays: 1n,
    });

    const expectedPlatformFee = 5n * ONE_ETHER;
    const expectedStakingRewards = 5n * ONE_ETHER;
    const feeRecipientBalanceBefore = await paymentToken.balanceOf(other.address);
    const stakerBalanceBefore = await paymentToken.balanceOf(employee.address);
    await vault.connect(employer).claimYield(0n);
    const feeRecipientBalanceAfter = await paymentToken.balanceOf(other.address);

    expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(expectedPlatformFee);
    expect(await staking.earned(employee.address)).to.equal(expectedStakingRewards);

    await staking.connect(employee).claimRewards();
    const stakerBalanceAfter = await paymentToken.balanceOf(employee.address);
    expect(stakerBalanceAfter - stakerBalanceBefore).to.equal(expectedStakingRewards);
  });

  it("lets owner change the staking rewards contract", async function () {
    const { deployer, employer, employee, governanceToken, paymentToken, aavePool, staking, vault } =
      await deploySuite();
    const amount = 1_000n * ONE_ETHER;
    const yieldAmount = 100n * ONE_ETHER;
    const replacementStaking = await ethers.deployContract("TGTStaking", [
      await governanceToken.getAddress(),
      await paymentToken.getAddress(),
      deployer.address,
    ]);

    await vault.connect(deployer).setGovernanceToken(await governanceToken.getAddress());
    await vault.connect(deployer).setStakingRewardsContract(await replacementStaking.getAddress());
    await governanceToken.connect(deployer).transfer(employee.address, 100n * ONE_ETHER);
    await governanceToken.connect(employee).approve(await replacementStaking.getAddress(), 100n * ONE_ETHER);
    await replacementStaking.connect(employee).stake(100n * ONE_ETHER);

    await createServiceAndYield({
      employer,
      employee,
      paymentToken,
      aavePool,
      vault,
      amount,
      yieldAmount,
      lockDays: 1n,
    });

    const expectedPlatformFee = 5n * ONE_ETHER;
    const expectedStakingRewards = 5n * ONE_ETHER;
    const platformBalanceBefore = await paymentToken.balanceOf(deployer.address);
    const oldStakingBalanceBefore = await paymentToken.balanceOf(await staking.getAddress());
    const replacementBalanceBefore = await paymentToken.balanceOf(await replacementStaking.getAddress());
    await vault.connect(employer).claimYield(0n);
    const platformBalanceAfter = await paymentToken.balanceOf(deployer.address);
    const oldStakingBalanceAfter = await paymentToken.balanceOf(await staking.getAddress());
    const replacementBalanceAfter = await paymentToken.balanceOf(await replacementStaking.getAddress());

    expect(platformBalanceAfter - platformBalanceBefore).to.equal(expectedPlatformFee);
    expect(oldStakingBalanceAfter - oldStakingBalanceBefore).to.equal(0n);
    expect(replacementBalanceAfter - replacementBalanceBefore).to.equal(expectedStakingRewards);
  });

  it("still lets employee claim principal after lock", async function () {
    const { deployer, employer, employee, nft, governanceToken, paymentToken, aavePool, vault } = await deploySuite();
    const amount = 1_000n * ONE_ETHER;

    await vault.connect(deployer).setGovernanceToken(await governanceToken.getAddress());
    await createServiceAndYield({
      employer,
      employee,
      paymentToken,
      aavePool,
      vault,
      amount,
      yieldAmount: 0n,
      lockDays: 1n,
    });

    const employeeBalanceBefore = await paymentToken.balanceOf(employee.address);
    await vault.connect(employee).releasePayment(0n);
    const employeeBalanceAfter = await paymentToken.balanceOf(employee.address);

    expect(employeeBalanceAfter - employeeBalanceBefore).to.equal(amount);
    expect(await nft.isPaid(0n)).to.equal(true);
  });

  it("does not allow yield claim before lock expiration", async function () {
    const { deployer, employer, employee, governanceToken, paymentToken, aavePool, vault } = await deploySuite();
    const amount = 500n * ONE_ETHER;

    await vault.connect(deployer).setGovernanceToken(await governanceToken.getAddress());

    await paymentToken.mint(employer.address, amount);
    await paymentToken.connect(employer).approve(await vault.getAddress(), amount);
    await vault.connect(employer).deposit(employee.address, await paymentToken.getAddress(), amount, 3n);

    await aavePool.accrueYield(await paymentToken.getAddress(), 50n * ONE_ETHER);
    await aavePool.setReserveNormalizedIncome(
      await paymentToken.getAddress(),
      (RAY * (amount + 50n * ONE_ETHER)) / amount,
    );

    await expect(vault.connect(employer).claimYield(0n)).to.be.revertedWith("Time lock not expired");
  });

  it("only allows the yield NFT owner to claim yield", async function () {
    const { deployer, employer, employee, other, governanceToken, paymentToken, aavePool, vault } =
      await deploySuite();
    const amount = 700n * ONE_ETHER;

    await vault.connect(deployer).setGovernanceToken(await governanceToken.getAddress());
    await createServiceAndYield({
      employer,
      employee,
      paymentToken,
      aavePool,
      vault,
      amount,
      yieldAmount: 70n * ONE_ETHER,
      lockDays: 1n,
    });

    await expect(vault.connect(other).claimYield(0n)).to.be.revertedWith(
      "Only the yield NFT owner can claim",
    );
  });

  it("restricts setGovernanceToken to owner", async function () {
    const { other, governanceToken, vault } = await deploySuite();

    await expect(vault.connect(other).setGovernanceToken(await governanceToken.getAddress()))
      .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount")
      .withArgs(other.address);
  });

  it("restricts setPlatformFeeRecipient to owner", async function () {
    const { other, vault } = await deploySuite();

    await expect(vault.connect(other).setPlatformFeeRecipient(other.address))
      .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount")
      .withArgs(other.address);
  });

  it("restricts setStakingRewardsContract to owner", async function () {
    const { other, vault } = await deploySuite();

    await expect(vault.connect(other).setStakingRewardsContract(other.address))
      .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount")
      .withArgs(other.address);
  });

  it("does not let owner replace NFT escrow vaults after initial setup", async function () {
    const { deployer, other, nft, yieldRightNft } = await deploySuite();

    await expect(nft.connect(deployer).setEscrowVault(other.address)).to.be.revertedWith(
      "Escrow Vault already set",
    );
    await expect(yieldRightNft.connect(deployer).setEscrowVault(other.address)).to.be.revertedWith(
      "Escrow Vault already set",
    );
  });

  it("requires governance token to be configured before deposits", async function () {
    const { employer, employee, paymentToken, vault } = await deploySuite();
    const amount = 500n * ONE_ETHER;

    await paymentToken.mint(employer.address, amount);
    await paymentToken.connect(employer).approve(await vault.getAddress(), amount);

    await expect(
      vault.connect(employer).deposit(employee.address, await paymentToken.getAddress(), amount, 1n),
    ).to.be.revertedWith("Governance token not configured");
  });
});
