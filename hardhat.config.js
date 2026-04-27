import "dotenv/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

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

const baseSepoliaRpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const baseSepoliaPrivateKey = process.env.BASE_SEPOLIA_PRIVATE_KEY;

if (baseSepoliaPrivateKey) {
  networks.baseSepolia = {
    type: "http",
    chainType: "op",
    url: baseSepoliaRpcUrl,
    accounts: [baseSepoliaPrivateKey],
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
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
    blockscout: {
      enabled: false,
    },
  },
  networks,
});
