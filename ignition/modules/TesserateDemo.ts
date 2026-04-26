import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TesserateDemoModule = buildModule("TesserateDemoModule", (m) => {
  const owner = m.getAccount(0);
  const maxPriceAge = m.getParameter("maxPriceAge", 86_400n);
  const stakingVotingPowerDelay = m.getParameter("stakingVotingPowerDelay", 60n);
  const escrowDurationUnitSeconds = m.getParameter("escrowDurationUnitSeconds", 60n);
  const escrowMinDurationUnits = m.getParameter("escrowMinDurationUnits", 1n);
  const escrowMaxDurationUnits = m.getParameter("escrowMaxDurationUnits", 60n);
  const daoVotingDelay = m.getParameter("daoVotingDelay", 0n);
  const daoVotingPeriod = m.getParameter("daoVotingPeriod", 3_600n);
  const daoProposalThreshold = m.getParameter("daoProposalThreshold", 1_000n * 10n ** 18n);
  const daoQuorumBps = m.getParameter("daoQuorumBps", 2_000n);

  const mockUsdc = m.contract("MockERC20", ["Tesserate Demo USDC", "dUSDC"]);
  const mockAavePool = m.contract("MockAavePool");
  const mockUsdcUsdFeed = m.contract("MockAggregatorV3", [8, 100_000_000n]);

  const guaranteeNFT = m.contract("GuaranteeNFT", [owner]);
  const yieldRightNFT = m.contract("YieldRightNFT", [owner]);
  const tesserateGovernanceToken = m.contract("TesserateGovernanceToken", [owner, owner]);
  const tgtStaking = m.contract("TGTStaking", [
    tesserateGovernanceToken,
    mockUsdc,
    owner,
    stakingVotingPowerDelay,
  ]);
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
    mockAavePool,
    mockUsdc,
    tgtStaking,
    escrowDurationUnitSeconds,
    escrowMinDurationUnits,
    escrowMaxDurationUnits,
  ]);

  m.call(guaranteeNFT, "setEscrowVault", [escrowVault]);
  m.call(yieldRightNFT, "setEscrowVault", [escrowVault]);
  m.call(escrowVault, "setGovernanceToken", [tesserateGovernanceToken]);
  m.call(chainlinkPriceOracle, "setPriceFeed", [mockUsdc, mockUsdcUsdFeed]);

  return {
    mockUsdc,
    mockAavePool,
    mockUsdcUsdFeed,
    guaranteeNFT,
    yieldRightNFT,
    tesserateGovernanceToken,
    tgtStaking,
    tgtDao,
    chainlinkPriceOracle,
    escrowVault,
  };
});

export default TesserateDemoModule;
