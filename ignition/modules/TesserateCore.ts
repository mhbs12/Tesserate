import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TesserateCoreModule = buildModule("TesserateCoreModule", (m) => {
  const owner = m.getAccount(0);
  const aavePool = m.getParameter("aavePool");
  const paymentToken = m.getParameter("paymentToken");
  const paymentTokenPriceFeed = m.getParameter("paymentTokenPriceFeed");
  const maxPriceAge = m.getParameter("maxPriceAge", 86_400n);
  const daoVotingDelay = m.getParameter("daoVotingDelay", 0n);
  const daoVotingPeriod = m.getParameter("daoVotingPeriod", 259_200n);
  const daoProposalThreshold = m.getParameter("daoProposalThreshold", 1_000n * 10n ** 18n);
  const daoQuorumBps = m.getParameter("daoQuorumBps", 2_000n);

  const guaranteeNFT = m.contract("GuaranteeNFT", [owner]);
  const yieldRightNFT = m.contract("YieldRightNFT", [owner]);
  const tesserateGovernanceToken = m.contract("TesserateGovernanceToken", [owner, owner]);
  const tgtStaking = m.contract("TGTStaking", [tesserateGovernanceToken, paymentToken, owner]);
  const tgtDao = m.contract("TgtDao", [
    tgtStaking,
    owner,
    daoVotingDelay,
    daoVotingPeriod,
    daoProposalThreshold,
    daoQuorumBps,
  ]);
  const chainlinkPriceOracle = m.contract("ChainlinkPriceOracle", [owner, maxPriceAge]);
  const escrowVault = m.contract("EscrowVault", [
    guaranteeNFT,
    yieldRightNFT,
    chainlinkPriceOracle,
    aavePool,
    paymentToken,
    tgtStaking,
  ]);

  m.call(guaranteeNFT, "setEscrowVault", [escrowVault]);
  m.call(yieldRightNFT, "setEscrowVault", [escrowVault]);
  m.call(escrowVault, "setGovernanceToken", [tesserateGovernanceToken]);
  m.call(chainlinkPriceOracle, "setPriceFeed", [paymentToken, paymentTokenPriceFeed]);

  return {
    guaranteeNFT,
    yieldRightNFT,
    tesserateGovernanceToken,
    tgtStaking,
    tgtDao,
    chainlinkPriceOracle,
    escrowVault,
  };
});

export default TesserateCoreModule;
