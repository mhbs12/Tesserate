import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

const ROOT = process.cwd();
const DEPLOYMENT_FILE = path.join(
  ROOT,
  "ignition",
  "deployments",
  "chain-11155111",
  "deployed_addresses.json",
);

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function artifact(contractName) {
  return readJson(path.join(ROOT, "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`));
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in .env`);
  }
  return value;
}

function deployedAddress(deployments, contractName) {
  const value = deployments[`TesserateCoreModule#${contractName}`];
  if (!value) {
    throw new Error(`Missing deployed address for ${contractName}`);
  }
  return value;
}

async function approveIfNeeded(token, owner, spender, amount) {
  const allowance = await token.allowance(owner, spender);
  if (allowance >= amount) {
    return;
  }

  const tx = await token.approve(spender, amount);
  console.log(`approve tx: ${tx.hash}`);
  await tx.wait();
}

async function main() {
  const deployments = readJson(DEPLOYMENT_FILE);
  const provider = new ethers.JsonRpcProvider(requireEnv("SEPOLIA_RPC_URL"));
  const signer = new ethers.Wallet(requireEnv("SEPOLIA_PRIVATE_KEY"), provider);
  const signerAddress = await signer.getAddress();
  const network = await provider.getNetwork();

  const addresses = {
    oracle: deployedAddress(deployments, "ChainlinkPriceOracle"),
    guaranteeNFT: deployedAddress(deployments, "GuaranteeNFT"),
    tgt: deployedAddress(deployments, "TesserateGovernanceToken"),
    yieldRightNFT: deployedAddress(deployments, "YieldRightNFT"),
    staking: deployedAddress(deployments, "TGTStaking"),
    escrow: deployedAddress(deployments, "EscrowVault"),
    dao: deployedAddress(deployments, "TgtDao"),
  };

  const oracle = new ethers.Contract(addresses.oracle, artifact("ChainlinkPriceOracle").abi, signer);
  const guaranteeNFT = new ethers.Contract(addresses.guaranteeNFT, artifact("GuaranteeNFT").abi, signer);
  const yieldRightNFT = new ethers.Contract(addresses.yieldRightNFT, artifact("YieldRightNFT").abi, signer);
  const tgt = new ethers.Contract(addresses.tgt, artifact("TesserateGovernanceToken").abi, signer);
  const staking = new ethers.Contract(addresses.staking, artifact("TGTStaking").abi, signer);
  const escrow = new ethers.Contract(addresses.escrow, artifact("EscrowVault").abi, signer);
  const dao = new ethers.Contract(addresses.dao, artifact("TgtDao").abi, signer);

  const usdcAddress = await escrow.usdcToken();
  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
  const usdcDecimals = await usdc.decimals();

  console.log(`network: ${network.name} (${network.chainId})`);
  console.log(`signer: ${signerAddress}`);
  console.log(`ETH balance: ${ethers.formatEther(await provider.getBalance(signerAddress))}`);
  console.log("");
  console.log("deployed contracts:");
  for (const [name, address] of Object.entries(addresses)) {
    console.log(`- ${name}: ${address}`);
  }

  console.log("");
  console.log("configuration checks:");
  console.log(`- escrow.usdcToken: ${usdcAddress}`);
  console.log(`- escrow.aavePool: ${await escrow.aavePool()}`);
  console.log(`- escrow.priceOracle: ${await escrow.priceOracle()}`);
  console.log(`- escrow.governanceToken: ${await escrow.governanceToken()}`);
  console.log(`- escrow.stakingRewardsContract: ${await escrow.stakingRewardsContract()}`);
  console.log(`- guaranteeNFT.escrowVault: ${await guaranteeNFT.escrowVault()}`);
  console.log(`- yieldRightNFT.escrowVault: ${await yieldRightNFT.escrowVault()}`);
  console.log(`- staking.stakingToken: ${await staking.stakingToken()}`);
  console.log(`- staking.rewardToken: ${await staking.rewardToken()}`);
  console.log(`- dao staking contract: ${await dao.staking()}`);
  console.log(`- oracle USDC feed: ${await oracle.priceFeeds(usdcAddress)}`);

  console.log("");
  console.log("wallet balances:");
  console.log(`- TGT: ${ethers.formatUnits(await tgt.balanceOf(signerAddress), 18)}`);
  console.log(`- USDC: ${ethers.formatUnits(await usdc.balanceOf(signerAddress), usdcDecimals)}`);
  console.log(`- staked TGT: ${ethers.formatUnits(await staking.stakedBalance(signerAddress), 18)}`);
  console.log(`- earned USDC rewards: ${ethers.formatUnits(await staking.earned(signerAddress), usdcDecimals)}`);
  console.log(`- fee bps for signer: ${await escrow.getFeeBpsFor(signerAddress)}`);

  const stakeAmountRaw = process.env.SMOKE_STAKE_TGT;
  if (stakeAmountRaw) {
    const amount = ethers.parseUnits(stakeAmountRaw, 18);
    await approveIfNeeded(tgt, signerAddress, addresses.staking, amount);

    const tx = await staking.stake(amount);
    console.log(`stake tx: ${tx.hash}`);
    await tx.wait();
    console.log(`staked ${stakeAmountRaw} TGT`);
  }

  const depositAmountRaw = process.env.SMOKE_DEPOSIT_USDC;
  if (depositAmountRaw) {
    const employee = process.env.SMOKE_EMPLOYEE || signerAddress;
    const durationDays = BigInt(process.env.SMOKE_DURATION_DAYS || "1");
    const amount = ethers.parseUnits(depositAmountRaw, usdcDecimals);
    await approveIfNeeded(usdc, signerAddress, addresses.escrow, amount);

    const tx = await escrow.deposit(employee, usdcAddress, amount, durationDays);
    console.log(`deposit tx: ${tx.hash}`);
    const receipt = await tx.wait();

    for (const log of receipt.logs) {
      try {
        const parsed = escrow.interface.parseLog(log);
        if (parsed?.name === "ServiceCreated") {
          console.log(`guaranteeTokenId: ${parsed.args.guaranteeTokenId}`);
          console.log(`yieldRightTokenId: ${parsed.args.yieldRightTokenId}`);
        }
      } catch {
        // Ignore logs from USDC, NFTs and Aave.
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
