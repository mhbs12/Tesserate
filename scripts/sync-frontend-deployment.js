import fs from "node:fs";
import path from "node:path";

import { getNetworkConfig } from "./networks.js";

const ROOT = process.cwd();
const networkName = process.argv[2] || "base-sepolia";
const network = getNetworkConfig(networkName);

const deploymentPath = path.join(
  ROOT,
  "ignition",
  "deployments",
  network.deploymentFile,
  "deployed_addresses.json",
);

const outputPath = path.join(ROOT, "frontend", "deployment.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function deployedAddress(deployments, contractName) {
  return deployments[`${network.moduleName}#${contractName}`] || "";
}

if (!fs.existsSync(deploymentPath)) {
  throw new Error(`Deployment file not found: ${deploymentPath}`);
}

const deployments = readJson(deploymentPath);
const journalPath = path.join(ROOT, "ignition", "deployments", network.deploymentFile, "journal.jsonl");

function deploymentBlock(contractName) {
  if (!fs.existsSync(journalPath)) return undefined;

  const futureId = `${network.moduleName}#${contractName}`;
  const lines = fs.readFileSync(journalPath, "utf8").split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const entry = JSON.parse(line);
    if (entry.futureId === futureId && entry.receipt?.blockNumber) {
      return entry.receipt.blockNumber;
    }
  }

  return undefined;
}

const frontendDeployment = {
  network: {
    name: network.name,
    chainId: network.chainId,
    hexChainId: `0x${network.chainId.toString(16)}`,
    rpcUrls: network.chainId === 84532 ? ["https://sepolia.base.org"] : [],
    blockExplorerUrls: [network.explorerAddressUrl.replace(/\/address\/$/, "")],
    explorerAddressUrl: network.explorerAddressUrl,
  },
  external: network.external,
  contracts: {
    priceOracle: {
      label: "ChainlinkPriceOracle",
      address: deployedAddress(deployments, "ChainlinkPriceOracle"),
    },
    guaranteeNft: {
      label: "GuaranteeNFT",
      address: deployedAddress(deployments, "GuaranteeNFT"),
      startBlock: deploymentBlock("GuaranteeNFT"),
    },
    governanceToken: {
      label: "TesserateGovernanceToken",
      address: deployedAddress(deployments, "TesserateGovernanceToken"),
    },
    yieldRightNft: {
      label: "YieldRightNFT",
      address: deployedAddress(deployments, "YieldRightNFT"),
      startBlock: deploymentBlock("YieldRightNFT"),
    },
    staking: {
      label: "TGTStaking",
      address: deployedAddress(deployments, "TGTStaking"),
    },
    escrow: {
      label: "EscrowVault",
      address: deployedAddress(deployments, "EscrowVault"),
    },
    dao: {
      label: "TgtDao",
      address: deployedAddress(deployments, "TgtDao"),
    },
    faucet: {
      label: "TestTgtFaucet",
      address: deployedAddress(deployments, "TestTgtFaucet"),
    },
  },
};

fs.writeFileSync(outputPath, `${JSON.stringify(frontendDeployment, null, 2)}\n`);

console.log(`Frontend deployment synced: ${outputPath}`);
