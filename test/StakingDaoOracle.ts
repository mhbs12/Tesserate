import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();
const ONE_ETHER = 10n ** 18n;

describe("TGT Staking", function () {
  it("allows staking and unstaking TGT", async function () {
    const [deployer, staker] = await ethers.getSigners();

    const token = await ethers.deployContract("TesserateGovernanceToken", [deployer.address, deployer.address]);
    const staking = await ethers.deployContract("TGTStaking", [await token.getAddress(), deployer.address]);

    await token.connect(deployer).transfer(staker.address, 1_000n * ONE_ETHER);
    await token.connect(staker).approve(await staking.getAddress(), 700n * ONE_ETHER);

    await staking.connect(staker).stake(700n * ONE_ETHER);
    expect(await staking.stakedBalance(staker.address)).to.equal(700n * ONE_ETHER);
    expect(await staking.totalStaked()).to.equal(700n * ONE_ETHER);

    await staking.connect(staker).unstake(250n * ONE_ETHER);
    expect(await staking.stakedBalance(staker.address)).to.equal(450n * ONE_ETHER);
    expect(await staking.totalStaked()).to.equal(450n * ONE_ETHER);
  });
});

describe("Simple TGT DAO", function () {
  it("creates, votes and executes a successful proposal", async function () {
    const [deployer, alice, bob] = await ethers.getSigners();

    const token = await ethers.deployContract("TesserateGovernanceToken", [deployer.address, deployer.address]);
    const staking = await ethers.deployContract("TGTStaking", [await token.getAddress(), deployer.address]);
    const dao = await ethers.deployContract("SimpleTgtDao", [
      await staking.getAddress(),
      deployer.address,
      0n,
      3n * 24n * 60n * 60n,
      100n * ONE_ETHER,
      2_000n,
    ]);
    const target = await ethers.deployContract("MockGovernanceTarget");

    await token.connect(deployer).transfer(alice.address, 1_200n * ONE_ETHER);
    await token.connect(deployer).transfer(bob.address, 200n * ONE_ETHER);

    await token.connect(alice).approve(await staking.getAddress(), 1_200n * ONE_ETHER);
    await token.connect(bob).approve(await staking.getAddress(), 200n * ONE_ETHER);
    await staking.connect(alice).stake(1_200n * ONE_ETHER);
    await staking.connect(bob).stake(200n * ONE_ETHER);

    const proposalData = target.interface.encodeFunctionData("setStoredValue", [99n]);
    await dao.connect(alice).propose(await target.getAddress(), 0n, proposalData, "Set target value to 99");

    await dao.connect(alice).vote(1n, true);
    await dao.connect(bob).vote(1n, false);

    await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    expect(await dao.state(1n)).to.equal(3n);

    await dao.execute(1n);
    expect(await dao.state(1n)).to.equal(4n);
    expect(await target.storedValue()).to.equal(99n);
  });

  it("marks proposal as defeated when quorum is not reached", async function () {
    const [deployer, alice, bob] = await ethers.getSigners();

    const token = await ethers.deployContract("TesserateGovernanceToken", [deployer.address, deployer.address]);
    const staking = await ethers.deployContract("TGTStaking", [await token.getAddress(), deployer.address]);
    const dao = await ethers.deployContract("SimpleTgtDao", [
      await staking.getAddress(),
      deployer.address,
      0n,
      24n * 60n * 60n,
      50n * ONE_ETHER,
      8_000n,
    ]);
    const target = await ethers.deployContract("MockGovernanceTarget");

    await token.connect(deployer).transfer(alice.address, 100n * ONE_ETHER);
    await token.connect(deployer).transfer(bob.address, 900n * ONE_ETHER);

    await token.connect(alice).approve(await staking.getAddress(), 100n * ONE_ETHER);
    await token.connect(bob).approve(await staking.getAddress(), 900n * ONE_ETHER);
    await staking.connect(alice).stake(100n * ONE_ETHER);
    await staking.connect(bob).stake(900n * ONE_ETHER);

    const proposalData = target.interface.encodeFunctionData("setStoredValue", [7n]);
    await dao.connect(alice).propose(await target.getAddress(), 0n, proposalData, "Set value to 7");

    await dao.connect(alice).vote(1n, true);

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    expect(await dao.quorumReached(1n)).to.equal(false);
    expect(await dao.state(1n)).to.equal(2n);
  });
});

describe("Chainlink Oracle Integration", function () {
  it("returns price and converts token amount to USD 1e18", async function () {
    const [deployer] = await ethers.getSigners();

    const token = await ethers.deployContract("TesserateGovernanceToken", [deployer.address, deployer.address]);
    const feed = await ethers.deployContract("MockAggregatorV3", [8, 2000n * 10n ** 8n]);
    const oracle = await ethers.deployContract("ChainlinkPriceOracle", [deployer.address, 3600n]);

    await oracle.setPriceFeed(await token.getAddress(), await feed.getAddress());

    const [price, decimals] = await oracle.getLatestPrice(await token.getAddress());
    expect(price).to.equal(2000n * 10n ** 8n);
    expect(decimals).to.equal(8n);

    const usdValue = await oracle.getUsdValue(await token.getAddress(), 2n * ONE_ETHER, 18);
    expect(usdValue).to.equal(4000n * ONE_ETHER);
  });

  it("reverts when the oracle price is stale", async function () {
    const [deployer] = await ethers.getSigners();

    const token = await ethers.deployContract("TesserateGovernanceToken", [deployer.address, deployer.address]);
    const feed = await ethers.deployContract("MockAggregatorV3", [8, 1500n * 10n ** 8n]);
    const oracle = await ethers.deployContract("ChainlinkPriceOracle", [deployer.address, 3600n]);

    await oracle.setPriceFeed(await token.getAddress(), await feed.getAddress());

    const latestBlock = await ethers.provider.getBlock("latest");
    const staleTimestamp = BigInt(latestBlock!.timestamp) - 7200n;
    await feed.setUpdatedAt(staleTimestamp);

    await expect(oracle.getLatestPrice(await token.getAddress())).to.be.revertedWith("Stale oracle price");
  });
});
