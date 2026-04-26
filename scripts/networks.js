export const networks = {
  sepolia: {
    chainId: 11155111,
    name: "Sepolia",
    envPrefix: "SEPOLIA",
    defaultRpcUrl: "",
    fallbackPrivateKeyEnv: "",
    explorerAddressUrl: "https://sepolia.etherscan.io/address/",
    deploymentFile: "chain-11155111",
    moduleName: "TesserateCoreModule",
    external: {
      aavePool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
      usdc: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
      usdcPriceFeed: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E",
      aaveFaucetUrl: "https://app.aave.com/faucet/",
    },
  },
  "base-sepolia": {
    chainId: 84532,
    name: "Base Sepolia",
    envPrefix: "BASE_SEPOLIA",
    defaultRpcUrl: "https://sepolia.base.org",
    fallbackPrivateKeyEnv: "SEPOLIA_PRIVATE_KEY",
    explorerAddressUrl: "https://sepolia.basescan.org/address/",
    deploymentFile: "chain-84532",
    moduleName: "TesserateCoreModule",
    external: {
      aavePool: "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27",
      usdc: "0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f",
      usdcPriceFeed: "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165",
      aaveFaucetUrl: "https://app.aave.com/faucet/",
    },
  },
};

export function getNetworkConfig(name = "base-sepolia") {
  const config = networks[name];
  if (!config) {
    throw new Error(`Unknown network "${name}". Use: ${Object.keys(networks).join(", ")}`);
  }

  return config;
}
