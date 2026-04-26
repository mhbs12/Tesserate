import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TGT_TOKEN_SEPOLIA = "0xa41940aad4AF56aa108186693839F827eCe334b9";

const TgtFaucetModule = buildModule("TgtFaucetModule", (m) => {
  const owner = m.getAccount(0);
  const token = m.getParameter("token", TGT_TOKEN_SEPOLIA);
  const claimAmount = m.getParameter("claimAmount", 2_000n * 10n ** 18n);
  const cooldown = m.getParameter("cooldown", 86_400n);

  const faucet = m.contract("TestTgtFaucet", [
    token,
    owner,
    claimAmount,
    cooldown,
  ]);

  return { faucet };
});

export default TgtFaucetModule;
