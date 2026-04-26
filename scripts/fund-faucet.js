import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

import { getNetworkConfig } from "./networks.js";

const ROOT = process.cwd();
const networkName = process.argv[2] || "base-sepolia";
const network = getNetworkConfig(networkName);
const amountTgt = process.env.FAUCET_FUND_AMOUNT_TGT ?? "100000";

const erc20Abi = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in .env`);
  }
  return value;
}

function rpcUrl() {
  return process.env[`${network.envPrefix}_RPC_URL`] || network.defaultRpcUrl || requireEnv(`${network.envPrefix}_RPC_URL`);
}

function privateKey() {
  return process.env[`${network.envPrefix}_PRIVATE_KEY`]
    || (network.fallbackPrivateKeyEnv ? process.env[network.fallbackPrivateKeyEnv] : "")
    || requireEnv(`${network.envPrefix}_PRIVATE_KEY`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function deployedAddress(deployments, contractName) {
  return deployments[`${network.moduleName}#${contractName}`] || "";
}

const deploymentPath = path.join(
  ROOT,
  "ignition",
  "deployments",
  network.deploymentFile,
  "deployed_addresses.json",
);

if (!fs.existsSync(deploymentPath)) {
  throw new Error(`Deployment file not found: ${deploymentPath}`);
}

const deployments = readJson(deploymentPath);
const tokenAddress = deployedAddress(deployments, "TesserateGovernanceToken");
const deployedFaucetAddress = deployedAddress(deployments, "TestTgtFaucet");
const faucetAddress = deployedFaucetAddress || process.env.FAUCET_ADDRESS;

if (!ethers.isAddress(tokenAddress)) {
  throw new Error(`Missing deployed TGT address in ${deploymentPath}`);
}

if (!ethers.isAddress(faucetAddress)) {
  throw new Error("Missing FAUCET_ADDRESS in .env and no TestTgtFaucet found in deployment");
}

const provider = new ethers.JsonRpcProvider(rpcUrl());
const wallet = new ethers.Wallet(privateKey(), provider);
const token = new ethers.Contract(tokenAddress, erc20Abi, wallet);

const [decimals, symbol] = await Promise.all([token.decimals(), token.symbol()]);
const amount = ethers.parseUnits(amountTgt, decimals);

console.log(`Network: ${network.name}`);
if (process.env.FAUCET_ADDRESS && deployedFaucetAddress && process.env.FAUCET_ADDRESS !== deployedFaucetAddress) {
  console.log(`Ignoring FAUCET_ADDRESS from .env (${process.env.FAUCET_ADDRESS}); using deployed TestTgtFaucet.`);
}
console.log(`Funding faucet ${faucetAddress} with ${amountTgt} ${symbol}...`);
const tx = await token.transfer(faucetAddress, amount);
console.log(`Transaction sent: ${tx.hash}`);

await tx.wait();

const faucetBalance = await token.balanceOf(faucetAddress);
console.log(`Faucet balance: ${ethers.formatUnits(faucetBalance, decimals)} ${symbol}`);
