import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";

const networks = {
  hardhatMainnet: {
    type: "edr-simulated",
    chainType: "l1",
  },
  hardhatOp: {
    type: "edr-simulated",
    chainType: "op",
  },
};

if (process.env.SEPOLIA_RPC_URL && process.env.SEPOLIA_PRIVATE_KEY) {
  networks.sepolia = {
    type: "http",
    chainType: "l1",
    url: process.env.SEPOLIA_RPC_URL,
    accounts: [process.env.SEPOLIA_PRIVATE_KEY],
  };
}

const solidityProfile = {
  version: "0.8.28",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    viaIR: true,
  },
};

const legacySolidityProfile = {
  version: "0.8.28",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};

const remixCompatProfile = {
  version: "0.8.20",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};

const remixNoOptimizerProfile = {
  version: "0.8.28",
  settings: {},
};

const remix020NoOptimizerProfile = {
  version: "0.8.20",
  settings: {},
};

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: solidityProfile,
      production: solidityProfile,
      legacy: legacySolidityProfile,
      remixCompat: remixCompatProfile,
      remixNoOptimizer: remixNoOptimizerProfile,
      remix020NoOptimizer: remix020NoOptimizerProfile,
    },
  },
  networks,
});
