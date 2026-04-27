const { ethers } = window;

let appConfig = {
  network: {
    name: "Base Sepolia",
    chainId: 84532,
    hexChainId: "0x14a34",
    rpcUrls: ["https://sepolia.base.org"],
    blockExplorerUrls: ["https://sepolia.basescan.org"],
    explorerAddressUrl: "https://sepolia.basescan.org/address/",
  },
  external: {
    aaveFaucetUrl: "https://app.aave.com/faucet/",
    usdc: "0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f",
  },
  indexing: {
    logChunkSize: 5_000,
    minLogChunkSize: 250,
    retryDelayMs: 200,
  },
};

const FAUCET_STORAGE_KEY = "tesserate:base-sepolia:faucet-address";
const RAY = 10n ** 27n;
const AAVE_ROUNDING_BUFFER = 1n;

const aaveErrorMessages = {
  51: "Aave recusou o deposito: o supply cap do USDC foi atingido. Tente um valor menor; se continuar, use o deploy demo com Aave mockado para apresentacao.",
  "0x47bc4b2c": "Aave recusou o saque: saldo aToken disponivel menor que o valor solicitado. Sincronize o frontend e use um deploy com o buffer de arredondamento da Aave.",
};

let contracts = {
  priceOracle: {
    label: "ChainlinkPriceOracle",
    address: "",
  },
  guaranteeNft: {
    label: "GuaranteeNFT",
    address: "",
  },
  governanceToken: {
    label: "TesserateGovernanceToken",
    address: "",
  },
  yieldRightNft: {
    label: "YieldRightNFT",
    address: "",
  },
  staking: {
    label: "TGTStaking",
    address: "",
  },
  escrow: {
    label: "EscrowVault",
    address: "",
  },
  dao: {
    label: "TgtDao",
    address: "",
  },
  faucet: {
    label: "TestTgtFaucet",
    address: "",
  },
};

const erc20Abi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const stakingAbi = [
  "function rewardToken() view returns (address)",
  "function totalStaked() view returns (uint256)",
  "function stakedBalance(address account) view returns (uint256)",
  "function earned(address account) view returns (uint256)",
  "function rewardReserve() view returns (uint256)",
  "function votingPower(address account) view returns (uint256)",
  "function pendingVotingPower(address account) view returns (uint256)",
  "function votingPowerUnlockTime(address account) view returns (uint256)",
  "function hasMaturedStake(address account) view returns (bool)",
  "function stake(uint256 amount) external",
  "function unstake(uint256 amount) external",
  "function activateVotingPower() external",
  "function claimRewards() external",
];

const escrowAbi = [
  "function usdcToken() view returns (address)",
  "function getFeeBpsFor(address account) view returns (uint256)",
  "function getDepositUsdValue(address paymentToken, uint256 amount) view returns (uint256)",
  "function getClaimableYield(uint256 yieldRightTokenId) view returns (uint256)",
  "function getClaimableYieldGross(uint256 yieldRightTokenId) view returns (uint256)",
  "function yieldRightToGuaranteeToken(uint256 yieldRightTokenId) view returns (uint256)",
  "function services(uint256 guaranteeTokenId) view returns (address employer, address employee, address paymentToken, uint256 amountLocked, uint256 startTime, uint256 lockDuration, uint256 yieldRightTokenId, uint256 startIncomeIndex, uint256 claimedYield, bool principalReleased)",
  "function deposit(address employee, address paymentToken, uint256 amount, uint256 durationUnits) external",
  "function claimYield(uint256 yieldRightTokenId) external",
  "function releasePayment(uint256 guaranteeTokenId) external",
];

const aavePoolAbi = [
  "function getReserveNormalizedIncome(address asset) view returns (uint256)",
];

const daoAbi = [
  "function owner() view returns (address)",
  "function proposalCount() view returns (uint256)",
  "function proposalThreshold() view returns (uint256)",
  "function quorumBps() view returns (uint256)",
  "function votingDelay() view returns (uint256)",
  "function votingPeriod() view returns (uint256)",
  "function propose(address target, uint256 value, bytes data, string description) returns (uint256)",
  "function vote(uint256 proposalId, bool support) external",
  "function execute(uint256 proposalId) external returns (bytes)",
  "function cancel(uint256 proposalId) external",
  "function state(uint256 proposalId) view returns (uint8)",
  "function getProposalSummary(uint256 proposalId) view returns (address proposer, address target, uint256 value, uint256 startTime, uint256 endTime, uint256 forVotes, uint256 againstVotes, uint256 quorumSnapshot, bool executed, bool canceled)",
  "function getProposalPayload(uint256 proposalId) view returns (bytes data, string description)",
  "function setQuorumBps(uint256 newQuorumBps)",
  "function setProposalThreshold(uint256 newProposalThreshold)",
  "function setVotingPeriod(uint256 newVotingPeriod)",
  "function setVotingDelay(uint256 newVotingDelay)",
];

const erc721Abi = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
];

const guaranteeNftAbi = [
  ...erc721Abi,
  "function isPaid(uint256 tokenId) view returns (bool)",
];

const yieldRightNftAbi = [
  ...erc721Abi,
];

const faucetAbi = [
  "function claim() external",
  "function claimAmount() view returns (uint256)",
  "function cooldown() view returns (uint256)",
  "function lastClaimedAt(address account) view returns (uint256)",
];

const proposalStates = ["Pending", "Active", "Defeated", "Succeeded", "Executed", "Canceled"];

const state = {
  provider: null,
  signer: null,
  account: "",
  chainId: null,
  activeView: "overview",
  tokenDecimals: 18,
  tokenSymbol: "TGT",
  rewardDecimals: 6,
  rewardSymbol: "USDC",
  rewardTokenAddress: "",
  usdcAddress: appConfig.external.usdc,
  faucetAddress: "",
  dashboard: null,
  nfts: {
    guarantee: [],
    yield: [],
    loaded: false,
    error: "",
  },
  faucetNextClaimAt: 0,
  now: Math.floor(Date.now() / 1000),
  lastDashboardUpdatedAt: 0,
  autoRefreshInFlight: false,
  nftRefreshInFlight: false,
  walletConnectInFlight: false,
  daoConfig: null,
  currentProposal: null,
  busyCount: 0,
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  await loadDeploymentConfig();
  bindElements();
  bindConfiguredLinks();
  bindEvents();
  els.faucetAddress.value = state.faucetAddress;
  renderContracts();
  setProposalPresetDefaults();
  render();
  if (!isEthersLoaded()) {
    showMessage("Biblioteca ethers nao carregou. Verifique se frontend/vendor/ethers.umd.min.js foi publicado.", "error");
  }
  startRealtimeClock();
  startDashboardAutoRefresh();
});

async function loadDeploymentConfig() {
  try {
    const response = await fetch("./deployment.json", { cache: "no-store" });
    if (!response.ok) return;

    const deployment = await response.json();
    appConfig = {
      ...appConfig,
      ...deployment,
      network: {
        ...appConfig.network,
        ...deployment.network,
      },
      external: {
        ...appConfig.external,
        ...deployment.external,
      },
      indexing: {
        ...appConfig.indexing,
        ...deployment.indexing,
      },
    };
    contracts = {
      ...contracts,
      ...deployment.contracts,
    };

    state.usdcAddress = appConfig.external.usdc || state.usdcAddress;

    const deployedFaucetAddress = contracts.faucet?.address || "";
    if (isValidAddress(deployedFaucetAddress)) {
      state.faucetAddress = deployedFaucetAddress;
      localStorage.setItem(FAUCET_STORAGE_KEY, deployedFaucetAddress);
    } else {
      state.faucetAddress = localStorage.getItem(FAUCET_STORAGE_KEY) || "";
    }
  } catch (_err) {
    // The static config above is enough to render a pre-deploy screen.
  }
}

function bindElements() {
  document.querySelectorAll("[id]").forEach((element) => {
    els[element.id] = element;
  });
}

function bindConfiguredLinks() {
  if (els.aaveFaucetButton && appConfig.external?.aaveFaucetUrl) {
    els.aaveFaucetButton.href = appConfig.external.aaveFaucetUrl;
  }
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.jump));
  });

  els.connectButton.addEventListener("click", connectWallet);
  els.disconnectButton.addEventListener("click", () => disconnectWallet());
  els.switchButton.addEventListener("click", switchToTargetNetwork);
  els.refreshButton.addEventListener("click", () => runTask("Atualizando dados", refreshAll));
  els.activateVotingButton.addEventListener("click", () => runTx("Ativando voting power", async () => {
    const tx = await getContracts().staking.activateVotingPower();
    await tx.wait();
    await refreshAll();
  }));
  els.claimRewardsButton.addEventListener("click", () => runTx("Sacando rewards", async () => {
    const tx = await getContracts().staking.claimRewards();
    await tx.wait();
    await refreshAll();
  }));
  els.saveFaucetButton.addEventListener("click", saveFaucetAddress);
  els.refreshFaucetButton.addEventListener("click", () => runTask("Atualizando faucet", loadFaucet));
  els.claimFaucetButton.addEventListener("click", claimFromFaucet);

  els.stakeForm.addEventListener("submit", onStake);
  els.unstakeForm.addEventListener("submit", onUnstake);
  els.previewDepositButton.addEventListener("click", previewDeposit);
  els.depositForm.addEventListener("submit", onDeposit);
  els.serviceLookupForm.addEventListener("submit", onLookupService);
  els.guaranteeNftList.addEventListener("click", onNftListClick);
  els.yieldNftList.addEventListener("click", onNftListClick);

  els.proposalPreset.addEventListener("change", setProposalPresetDefaults);
  els.proposalForm.addEventListener("submit", onCreateProposal);
  els.proposalLookupForm.addEventListener("submit", onLookupProposal);
  els.voteForButton.addEventListener("click", () => onVote(true));
  els.voteAgainstButton.addEventListener("click", () => onVote(false));
  els.executeProposalButton.addEventListener("click", onExecuteProposal);
  els.cancelProposalButton.addEventListener("click", onCancelProposal);

  if (window.ethereum) {
    window.ethereum.on?.("accountsChanged", (accounts) => {
      if (!accounts?.length) {
        disconnectWallet({ revoke: false, silent: true });
        return;
      }
      handleWalletChanged();
    });
    window.ethereum.on?.("chainChanged", handleWalletChanged);
  }
}

function setView(view) {
  state.activeView = view;
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.viewPanel === view);
  });
  els.viewTitle.textContent = {
    overview: "Overview",
    staking: "Staking",
    escrow: "Escrow",
    nfts: "Meus NFTs",
    dao: "DAO",
    contracts: "Contratos",
  }[view];
}

async function connectWallet() {
  if (!isEthersLoaded()) {
    showMessage("Biblioteca ethers nao carregou. Republique o frontend com frontend/vendor/ethers.umd.min.js.", "error");
    return;
  }

  if (!window.ethereum) {
    showMessage("Abra esta pagina em um navegador com MetaMask.", "error");
    return;
  }

  await runTask("Conectando wallet", async () => {
    state.walletConnectInFlight = true;
    try {
      await syncWalletFromProvider({ requestAccounts: true });
    } finally {
      state.walletConnectInFlight = false;
    }

    if (!isTargetNetwork()) {
      showMessage(`Wallet conectada. Troque para ${appConfig.network.name} para usar o dApp.`, "warning");
      return;
    }

    showMessage("Wallet conectada. Carregando dados on-chain...", "pending");
    await refreshAfterConnect();
  }, { successMessage: null });
}

async function handleWalletChanged() {
  if (state.walletConnectInFlight) return;

  await runTask("Atualizando wallet", async () => {
    const connected = await syncWalletFromProvider({ requestAccounts: false });
    if (!connected) return;

    if (!isTargetNetwork()) {
      showMessage(`Wallet conectada. Troque para ${appConfig.network.name} para usar o dApp.`, "warning");
      return;
    }

    await refreshAfterConnect();
  }, { successMessage: null });
}

async function syncWalletFromProvider({ requestAccounts }) {
  state.provider = new ethers.BrowserProvider(window.ethereum);

  if (requestAccounts) {
    await state.provider.send("eth_requestAccounts", []);
  } else {
    const accounts = await state.provider.send("eth_accounts", []);
    if (!accounts?.length) {
      resetWalletState();
      return false;
    }
  }

  state.signer = await state.provider.getSigner();
  state.account = await state.signer.getAddress();
  const network = await state.provider.getNetwork();
  state.chainId = network.chainId;
  render();
  return true;
}

async function disconnectWallet({ revoke = true, silent = false } = {}) {
  setBusy(true);
  try {
    if (revoke && window.ethereum?.request) {
      await window.ethereum.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    }
  } catch (_err) {
    // Some wallets don't support permission revocation. Local disconnect still keeps the dApp clean.
  } finally {
    resetWalletState();
    setBusy(false);
    if (!silent) showMessage("Wallet desconectada neste site.", "success");
  }
}

function resetWalletState() {
  state.provider = null;
  state.signer = null;
  state.account = "";
  state.chainId = null;
  state.dashboard = null;
  state.nfts = {
    guarantee: [],
    yield: [],
    loaded: false,
    error: "",
  };
  state.faucetNextClaimAt = 0;
  state.rewardTokenAddress = "";
  state.tokenDecimals = 18;
  state.tokenSymbol = "TGT";
  state.rewardDecimals = 6;
  state.rewardSymbol = "USDC";
  state.lastDashboardUpdatedAt = 0;
  state.daoConfig = null;
  state.currentProposal = null;
  clearWalletOutputs();
  render();
}

function clearWalletOutputs() {
  els.depositUsdValue.textContent = "-";
  els.claimableYieldValue.textContent = "-";
  els.principalAmountValue.textContent = "-";
  els.serviceUnlockValue.textContent = "-";
  clearCountdownElement(els.serviceTimeLeftValue, "-");
  els.guaranteeOwnerValue.textContent = "-";
  els.yieldOwnerValue.textContent = "-";
  clearCountdownElement(els.principalStatusValue, "-");
  els.proposalStateBadge.textContent = "sem consulta";
  els.proposalStateBadge.classList.add("muted");
  els.proposalProposer.textContent = "-";
  els.proposalTargetValue.textContent = "-";
  els.proposalVotes.textContent = "-";
  els.proposalPeriod.textContent = "-";
  els.proposalDescriptionValue.textContent = "-";
  els.proposalCountBadge.textContent = "0 propostas";
  els.daoReadyBadge.textContent = "sem voto ativo";
  els.daoReadyBadge.classList.add("muted");
  els.daoVotingPowerValue.textContent = "-";
  els.daoPendingVotingPowerValue.textContent = "-";
  els.daoThresholdValue.textContent = "-";
  els.daoQuorumValue.textContent = "-";
  els.daoVotingPeriodValue.textContent = "-";
  els.faucetBalanceValue.textContent = "-";
  els.faucetClaimAmountValue.textContent = "-";
  clearCountdownElement(els.faucetNextClaimValue, "-");
}

async function switchToTargetNetwork() {
  if (!window.ethereum) return;
  await runTask(`Trocando para ${appConfig.network.name}`, async () => {
    state.walletConnectInFlight = true;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: appConfig.network.hexChainId }],
      });
    } catch (err) {
      if (err?.code !== 4902) throw err;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: appConfig.network.hexChainId,
          chainName: appConfig.network.name,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: appConfig.network.rpcUrls || [],
          blockExplorerUrls: appConfig.network.blockExplorerUrls || [],
        }],
      });
    } finally {
      state.walletConnectInFlight = false;
    }
    await syncWalletFromProvider({ requestAccounts: false });
    showMessage(`${appConfig.network.name} conectada. Carregando dados on-chain...`, "pending");
    await refreshAfterConnect();
  }, { successMessage: null });
}

async function refreshAfterConnect() {
  try {
    await refreshAll();
    showMessage("Wallet conectada e dados atualizados.", "success");
  } catch (err) {
    showMessage(readError(err), "error");
  }
}

async function refreshAll() {
  requireWallet();
  if (!isTargetNetwork()) {
    render();
    throw new Error(`Wallet conectada fora da ${appConfig.network.name}.`);
  }

  if (!hasDeployment()) {
    render();
    throw new Error("Frontend ainda nao tem os enderecos do deploy. Rode o deploy na Base Sepolia e depois npm run frontend:sync:base-sepolia.");
  }

  const errors = [];

  try {
    await loadDashboard();
  } catch (err) {
    errors.push(`dashboard: ${readError(err)}`);
  }

  try {
    await loadDaoHeader();
  } catch (err) {
    errors.push(`DAO: ${readError(err)}`);
  }

  try {
    await loadWalletNfts();
  } catch (err) {
    state.nfts.error = readError(err);
    errors.push(`NFTs: ${state.nfts.error}`);
  }

  if (state.faucetAddress) {
    try {
      await loadFaucet();
    } catch (err) {
      errors.push(`faucet: ${readError(err)}`);
    }
  }

  render();

  if (errors.length > 0) {
    throw new Error(`Wallet conectada, mas algumas leituras falharam: ${errors.join(" | ")}`);
  }
}

async function loadDashboard() {
  const c = getContracts();
  const [
    tokenDecimals,
    tokenSymbol,
    rewardTokenAddress,
    totalStaked,
    stakedBalance,
    tokenBalance,
    earned,
    rewardReserve,
    votingPower,
    unlockTime,
    matured,
    feeBps,
    usdcAddress,
  ] = await Promise.all([
    c.token.decimals(),
    c.token.symbol(),
    c.staking.rewardToken(),
    c.staking.totalStaked(),
    c.staking.stakedBalance(state.account),
    c.token.balanceOf(state.account),
    c.staking.earned(state.account),
    c.staking.rewardReserve(),
    c.staking.votingPower(state.account),
    c.staking.votingPowerUnlockTime(state.account),
    c.staking.hasMaturedStake(state.account),
    c.escrow.getFeeBpsFor(state.account),
    c.escrow.usdcToken(),
  ]);

  state.tokenDecimals = Number(tokenDecimals);
  state.tokenSymbol = tokenSymbol;
  state.rewardTokenAddress = rewardTokenAddress;
  state.usdcAddress = usdcAddress;
  const pendingVotingPower = stakedBalance > votingPower ? stakedBalance - votingPower : 0n;

  const rewardToken = new ethers.Contract(rewardTokenAddress, erc20Abi, state.signer);
  try {
    const [rewardDecimals, rewardSymbol] = await Promise.all([
      rewardToken.decimals(),
      rewardToken.symbol(),
    ]);
    state.rewardDecimals = Number(rewardDecimals);
    state.rewardSymbol = rewardSymbol;
  } catch (_err) {
    state.rewardDecimals = 6;
    state.rewardSymbol = "USDC";
  }

  state.dashboard = {
    totalStaked,
    stakedBalance,
    tokenBalance,
    earned,
    rewardReserve,
    votingPower,
    pendingVotingPower,
    unlockTime,
    matured,
    feeBps,
  };
  state.lastDashboardUpdatedAt = state.now;
}

async function loadDaoHeader() {
  const dao = getContracts().dao;
  const [count, owner, proposalThreshold, quorumBps, votingDelay, votingPeriod] = await Promise.all([
    dao.proposalCount(),
    dao.owner(),
    dao.proposalThreshold(),
    dao.quorumBps(),
    dao.votingDelay(),
    dao.votingPeriod(),
  ]);

  state.daoConfig = {
    count,
    owner,
    proposalThreshold,
    quorumBps,
    votingDelay,
    votingPeriod,
  };

  els.proposalCountBadge.textContent = `${count.toString()} propostas`;
}

async function loadWalletNfts() {
  const c = getContracts();
  state.nfts.error = "";

  const guaranteeIds = await findOwnedTokenIds(c.guaranteeNft, state.account, contracts.guaranteeNft?.startBlock);
  const yieldIds = await findOwnedTokenIds(c.yieldRightNft, state.account, contracts.yieldRightNft?.startBlock);

  const [guaranteeItems, yieldItems] = await Promise.all([
    Promise.all(guaranteeIds.map((tokenId) => loadGuaranteeNftItem(c, tokenId))),
    Promise.all(yieldIds.map((tokenId) => loadYieldNftItem(c, tokenId))),
  ]);

  state.nfts = {
    guarantee: guaranteeItems.filter(Boolean),
    yield: yieldItems.filter(Boolean),
    loaded: true,
    error: "",
  };
}

async function findOwnedTokenIds(contract, account, startBlock) {
  const receivedLogs = await queryTransferLogs(contract, contract.filters.Transfer(null, account), startBlock);
  const sentLogs = await queryTransferLogs(contract, contract.filters.Transfer(account, null), startBlock);

  const candidates = new Set();
  [...receivedLogs, ...sentLogs].forEach((log) => {
    candidates.add(log.args.tokenId.toString());
  });

  const ownedIds = [];
  for (const tokenId of [...candidates].map(BigInt).sort(compareBigInt)) {
    try {
      const owner = await contract.ownerOf(tokenId);
      if (sameAddress(owner, account)) {
        ownedIds.push(tokenId);
      }
    } catch (_err) {
      // Burned or invalid token IDs should not break the wallet view.
    }
  }

  return ownedIds;
}

async function queryTransferLogs(contract, filter, startBlock) {
  const latestBlock = await state.provider.getBlockNumber();
  const firstBlock = Math.max(0, Number(startBlock || appConfig.indexing?.fromBlock || 0));
  if (firstBlock > latestBlock) return [];

  const logs = [];
  const preferredChunkSize = getPositiveInteger(appConfig.indexing?.logChunkSize, 5_000);
  const minChunkSize = Math.min(
    preferredChunkSize,
    getPositiveInteger(appConfig.indexing?.minLogChunkSize, 250),
  );
  const retryDelayMs = getPositiveInteger(appConfig.indexing?.retryDelayMs, 200);
  let chunkSize = preferredChunkSize;
  let fromBlock = firstBlock;

  while (fromBlock <= latestBlock) {
    const toBlock = Math.min(latestBlock, fromBlock + chunkSize - 1);
    try {
      logs.push(...await contract.queryFilter(filter, fromBlock, toBlock));
      fromBlock = toBlock + 1;
      chunkSize = Math.min(preferredChunkSize, chunkSize * 2);
    } catch (err) {
      if (!isRpcPayloadTooLargeError(err) || chunkSize <= minChunkSize) {
        throw err;
      }

      chunkSize = Math.max(minChunkSize, Math.floor(chunkSize / 2));
      await sleep(retryDelayMs);
    }
  }

  return logs;
}

async function loadGuaranteeNftItem(c, tokenId) {
  const [owner, service, isPaid] = await Promise.all([
    c.guaranteeNft.ownerOf(tokenId),
    c.escrow.services(tokenId),
    c.guaranteeNft.isPaid(tokenId),
  ]);

  if (sameAddress(service.employer, ethers.ZeroAddress)) return null;

  return {
    type: "guarantee",
    tokenId,
    owner,
    employer: service.employer,
    employee: service.employee,
    amountLocked: service.amountLocked,
    unlockTime: Number(service.startTime + service.lockDuration),
    yieldRightTokenId: service.yieldRightTokenId,
    principalReleased: Boolean(service.principalReleased || isPaid),
  };
}

async function loadYieldNftItem(c, tokenId) {
  const guaranteeTokenId = await c.escrow.yieldRightToGuaranteeToken(tokenId);
  const [owner, service] = await Promise.all([
    c.yieldRightNft.ownerOf(tokenId),
    c.escrow.services(guaranteeTokenId),
  ]);

  if (sameAddress(service.employer, ethers.ZeroAddress)) return null;

  const { claimableYield, grossYield } = await readYieldAmounts(c, tokenId, service, owner);

  return {
    type: "yield",
    tokenId,
    owner,
    guaranteeTokenId,
    employer: service.employer,
    employee: service.employee,
    amountLocked: service.amountLocked,
    unlockTime: Number(service.startTime + service.lockDuration),
    claimableYield,
    grossYield,
    claimedYield: service.claimedYield,
    principalReleased: Boolean(service.principalReleased),
  };
}

async function readYieldAmounts(c, tokenId, service, owner) {
  if (service.principalReleased) {
    return { claimableYield: 0n, grossYield: 0n };
  }

  if (Number(service.startTime + service.lockDuration) <= state.now) {
    const [claimableYield, grossYield] = await Promise.all([
      c.escrow.getClaimableYield(tokenId),
      c.escrow.getClaimableYieldGross(tokenId),
    ]);
    return { claimableYield, grossYield };
  }

  const grossYield = await estimateGrossYield(service);
  const feeBps = await c.escrow.getFeeBpsFor(owner);
  const totalFeeAmount = (grossYield * feeBps) / 10_000n;
  return {
    claimableYield: grossYield - totalFeeAmount,
    grossYield,
  };
}

async function estimateGrossYield(service) {
  if (!isValidAddress(appConfig.external?.aavePool)) return 0n;
  if (service.principalReleased) return 0n;

  const aavePool = new ethers.Contract(appConfig.external.aavePool, aavePoolAbi, state.provider);
  const currentIncomeIndex = await aavePool.getReserveNormalizedIncome(service.paymentToken);
  if (currentIncomeIndex <= service.startIncomeIndex) return 0n;

  const scaledPrincipal = (service.amountLocked * RAY) / service.startIncomeIndex;
  const grossUnderlying = (scaledPrincipal * currentIncomeIndex) / RAY;
  if (grossUnderlying <= service.amountLocked) return 0n;

  const accruedYield = grossUnderlying - service.amountLocked;
  const roundingBuffer = service.startIncomeIndex === RAY ? 0n : AAVE_ROUNDING_BUFFER;
  if (accruedYield <= service.claimedYield + roundingBuffer) return 0n;

  return accruedYield - service.claimedYield - roundingBuffer;
}

async function refreshNftRuntimeData() {
  if (!state.nfts.loaded || state.nftRefreshInFlight) return;

  state.nftRefreshInFlight = true;
  try {
    const c = getContracts();
    const [guaranteeItems, yieldItems] = await Promise.all([
      Promise.all((state.nfts.guarantee || []).map((item) => loadGuaranteeNftItem(c, item.tokenId))),
      Promise.all((state.nfts.yield || []).map((item) => loadYieldNftItem(c, item.tokenId))),
    ]);

    state.nfts = {
      guarantee: guaranteeItems.filter(Boolean),
      yield: yieldItems.filter(Boolean),
      loaded: true,
      error: "",
    };
  } finally {
    state.nftRefreshInFlight = false;
  }
}

async function onStake(event) {
  event.preventDefault();
  await runTx("Fazendo stake", async () => {
    const amount = parseTokenAmount(valueOf("stakeAmount"), state.tokenDecimals);
    const c = getContracts();

    const approvedNow = await ensureAllowance({
      token: c.token,
      owner: state.account,
      spender: contracts.staking.address,
      amount,
      decimals: state.tokenDecimals,
      symbol: state.tokenSymbol,
      approveLabel: "stake",
    });

    showMessage(
      approvedNow
        ? "Etapa 2/2: aprovacao confirmada. Agora confirme o stake na MetaMask."
        : "Allowance ja aprovada. Confirme o stake na MetaMask.",
      "pending",
    );
    const stakeTx = await c.staking.stake(amount);
    showMessage("Stake enviado. Aguardando confirmacao on-chain...", "pending");
    await stakeTx.wait();
    els.stakeAmount.value = "";
    await refreshAll();
  });
}

async function onUnstake(event) {
  event.preventDefault();
  await runTx("Fazendo unstake", async () => {
    const amount = parseTokenAmount(valueOf("unstakeAmount"), state.tokenDecimals);
    const tx = await getContracts().staking.unstake(amount);
    await tx.wait();
    els.unstakeAmount.value = "";
    await refreshAll();
  });
}

function saveFaucetAddress() {
  try {
    const faucetAddress = valueOf("faucetAddress");
    assertAddress(faucetAddress, "Faucet");

    state.faucetAddress = faucetAddress;
    localStorage.setItem(FAUCET_STORAGE_KEY, faucetAddress);
    renderContracts();
    render();
    showMessage("Faucet salvo neste navegador.", "success");
  } catch (err) {
    showMessage(readError(err), "error");
  }
}

async function loadFaucet() {
  requireWallet();
  if (!state.faucetAddress) {
    showMessage("Informe e salve o endereco do faucet primeiro.", "warning");
    return;
  }

  const faucet = getFaucetContract();
  const token = new ethers.Contract(contracts.governanceToken.address, erc20Abi, state.signer);
  const [claimAmount, cooldown, lastClaimedAt, faucetBalance] = await Promise.all([
    faucet.claimAmount(),
    faucet.cooldown(),
    faucet.lastClaimedAt(state.account),
    token.balanceOf(state.faucetAddress),
  ]);

  const nextClaimAt = Number(lastClaimedAt + cooldown);
  state.faucetNextClaimAt = nextClaimAt;

  els.faucetBalanceValue.textContent = `${formatToken(faucetBalance, state.tokenDecimals)} ${state.tokenSymbol}`;
  els.faucetClaimAmountValue.textContent = `${formatToken(claimAmount, state.tokenDecimals)} ${state.tokenSymbol}`;
  if (nextClaimAt <= state.now) {
    clearCountdownElement(els.faucetNextClaimValue, "disponivel agora");
  } else {
    setCountdownElement(els.faucetNextClaimValue, nextClaimAt, "disponivel agora", true);
  }
}

async function claimFromFaucet() {
  await runTx("Recebendo TGT do faucet", async () => {
    if (!state.faucetAddress) {
      throw new Error("Informe e salve o endereco do faucet primeiro.");
    }

    const tx = await getFaucetContract().claim();
    await tx.wait();
    await refreshAll();
  });
}

async function previewDeposit() {
  await runTask("Calculando USD", async () => {
    const amount = parseTokenAmount(valueOf("depositAmount"), state.rewardDecimals);
    const value = await getContracts().escrow.getDepositUsdValue(state.usdcAddress, amount);
    els.depositUsdValue.textContent = `$ ${formatToken(value, 18, 6)}`;
  });
}

async function onDeposit(event) {
  event.preventDefault();
  await runTx("Criando escrow", async () => {
    const employee = valueOf("employeeAddress");
    assertAddress(employee, "Funcionario");
    const amount = parseTokenAmount(valueOf("depositAmount"), state.rewardDecimals);
    const durationUnits = parseIntegerInRange(valueOf("durationUnits"), 1n, 60n, "Duracao");
    const c = getContracts();
    const usdc = new ethers.Contract(state.usdcAddress, erc20Abi, state.signer);

    const approvedNow = await ensureAllowance({
      token: usdc,
      owner: state.account,
      spender: contracts.escrow.address,
      amount,
      decimals: state.rewardDecimals,
      symbol: state.rewardSymbol,
      approveLabel: "deposito no escrow",
    });

    showMessage(
      approvedNow
        ? "Etapa 2/2: aprovacao confirmada. Agora confirme o deposito na MetaMask."
        : "Allowance ja aprovada. Confirme o deposito na MetaMask.",
      "pending",
    );
    const tx = await c.escrow.deposit(employee, state.usdcAddress, amount, durationUnits);
    showMessage("Deposito enviado. Aguardando confirmacao on-chain...", "pending");
    await tx.wait();
    els.depositAmount.value = "";
    await refreshAll();
  });
}

async function onLookupService(event) {
  event.preventDefault();
  await runTask("Consultando escrow", async () => {
    const guaranteeId = valueOf("guaranteeTokenId");
    const yieldId = valueOf("yieldTokenId");
    const c = getContracts();
    let service = null;

    if (guaranteeId) {
      const [owner, guaranteeService] = await Promise.all([
        c.guaranteeNft.ownerOf(BigInt(guaranteeId)),
        c.escrow.services(BigInt(guaranteeId)),
      ]);
      service = guaranteeService;
      els.guaranteeOwnerValue.textContent = owner;
      renderServiceLookup(service);
    }

    if (yieldId) {
      const yieldTokenId = BigInt(yieldId);
      const [owner, guaranteeFromYield] = await Promise.all([
        c.yieldRightNft.ownerOf(yieldTokenId),
        c.escrow.yieldRightToGuaranteeToken(yieldTokenId),
      ]);

      if (!service) {
        service = await c.escrow.services(guaranteeFromYield);
        els.guaranteeTokenId.value = guaranteeFromYield.toString();
        renderServiceLookup(service);
      }

      const { claimableYield } = await readYieldAmounts(c, yieldTokenId, service, owner);
      els.yieldOwnerValue.textContent = owner;
      els.claimableYieldValue.textContent = `${formatToken(claimableYield, state.rewardDecimals, 6)} ${state.rewardSymbol}`;
    }
  });
}

function renderServiceLookup(service) {
  const unlockTime = Number(service.startTime + service.lockDuration);

  els.principalAmountValue.textContent = service.principalReleased
    ? `0 ${state.rewardSymbol}`
    : `${formatToken(service.amountLocked, state.rewardDecimals, 6)} ${state.rewardSymbol}`;
  els.serviceUnlockValue.textContent = formatDate(unlockTime);
  setCountdownElement(els.serviceTimeLeftValue, unlockTime, "liberado agora");
  els.principalStatusValue.dataset.releaseStatus = String(unlockTime);
  els.principalStatusValue.dataset.released = service.principalReleased ? "true" : "false";
  els.principalStatusValue.textContent = service.principalReleased
    ? "pago"
    : unlockTime <= state.now
      ? "liberado"
      : "bloqueado";
  els.yieldTokenId.value = service.yieldRightTokenId.toString();
}

async function claimYieldToken(tokenId) {
  await runTx("Sacando yield", async () => {
    const tx = await getContracts().escrow.claimYield(tokenId);
    await tx.wait();
    await refreshAll();
    setView("nfts");
  });
}

async function releasePaymentToken(tokenId) {
  await runTx("Liberando principal", async () => {
    const tx = await getContracts().escrow.releasePayment(tokenId);
    await tx.wait();
    await refreshAll();
    setView("nfts");
  });
}

async function onCreateProposal(event) {
  event.preventDefault();
  await runTx("Criando proposal", async () => {
    const target = valueOf("proposalTarget");
    assertAddress(target, "Target");
    const value = ethers.parseEther(valueOf("proposalValue") || "0");
    const data = buildProposalData();
    const description = valueOf("proposalDescription");
    if (!description) throw new Error("Descricao obrigatoria.");

    const tx = await getContracts().dao.propose(target, value, data, description);
    const receipt = await tx.wait();
    const id = readProposalIdFromReceipt(receipt) || (await getContracts().dao.proposalCount()).toString();
    els.proposalId.value = id;
    await loadDaoHeader();
    await readProposalById(BigInt(id));
  });
}

async function onLookupProposal(event) {
  event.preventDefault();
  await lookupProposalById(valueOf("proposalId"));
}

async function lookupProposalById(id) {
  await runTask("Consultando proposal", async () => {
    await readProposalById(BigInt(id));
  });
}

async function readProposalById(proposalId) {
  const c = getContracts();
  const [summary, status, payload] = await Promise.all([
    c.dao.getProposalSummary(proposalId),
    c.dao.state(proposalId),
    c.dao.getProposalPayload(proposalId),
  ]);

  els.proposalStateBadge.textContent = proposalStates[Number(status)] || `Estado ${status}`;
  els.proposalStateBadge.classList.toggle("muted", false);
  els.proposalProposer.textContent = summary.proposer;
  els.proposalTargetValue.textContent = summary.target;
  els.proposalVotes.textContent = `${formatToken(summary.forVotes, state.tokenDecimals)} a favor / ${formatToken(summary.againstVotes, state.tokenDecimals)} contra`;
  els.proposalPeriod.textContent = `${formatDate(summary.startTime)} ate ${formatDate(summary.endTime)}`;
  els.proposalDescriptionValue.textContent = payload.description;
  state.currentProposal = {
    id: proposalId,
    proposer: summary.proposer,
    status: Number(status),
    startTime: Number(summary.startTime),
    endTime: Number(summary.endTime),
    executed: Boolean(summary.executed),
    canceled: Boolean(summary.canceled),
  };
}

async function onVote(support) {
  await runTx(support ? "Votando a favor" : "Votando contra", async () => {
    const tx = await getContracts().dao.vote(BigInt(valueOf("proposalId")), support);
    await tx.wait();
    await readProposalById(BigInt(valueOf("proposalId")));
  });
}

async function onExecuteProposal() {
  await runTx("Executando proposal", async () => {
    const tx = await getContracts().dao.execute(BigInt(valueOf("proposalId")));
    await tx.wait();
    await readProposalById(BigInt(valueOf("proposalId")));
  });
}

async function onCancelProposal() {
  await runTx("Cancelando proposal", async () => {
    const tx = await getContracts().dao.cancel(BigInt(valueOf("proposalId")));
    await tx.wait();
    await readProposalById(BigInt(valueOf("proposalId")));
  });
}

function buildProposalData() {
  const preset = valueOf("proposalPreset");
  const raw = valueOf("proposalData");

  if (preset === "signal") {
    return "0x";
  }

  if (!ethers.isHexString(raw)) throw new Error("Calldata custom precisa comecar com 0x.");
  return raw;
}

function setProposalPresetDefaults() {
  const preset = els.proposalPreset.value;
  els.proposalTarget.value = contracts.dao.address;
  els.proposalValue.value = "0";

  const defaults = {
    signal: {
      data: "0x",
      description: "Registrar proposta sinalizadora",
    },
    custom: {
      data: "0x",
      description: "Executar chamada customizada",
    },
  };

  els.proposalData.value = defaults[preset].data;
  els.proposalDescription.value = defaults[preset].description;
}

function render() {
  const connected = Boolean(state.account);
  const onTargetNetwork = isTargetNetwork();
  const deploymentReady = hasDeployment();
  const busy = state.busyCount > 0;

  els.connectionDot.classList.toggle("connected", connected && onTargetNetwork && deploymentReady);
  els.connectionDot.classList.toggle("warning", connected && (!onTargetNetwork || !deploymentReady));
  els.connectionLabel.textContent = connected ? shortAddress(state.account) : "Wallet desconectada";
  els.networkLabel.textContent = connected ? (onTargetNetwork ? appConfig.network.name : `Chain ${state.chainId}`) : appConfig.network.name;
  els.walletBadge.textContent = connected ? shortAddress(state.account) : "desconectada";
  els.walletBadge.classList.toggle("muted", !connected);
  els.accountValue.textContent = state.account || "-";
  els.chainValue.textContent = connected ? state.chainId.toString() : "-";
  els.usdcValue.textContent = state.usdcAddress || appConfig.external.usdc || "-";
  els.connectButton.textContent = connected ? "Reconectar" : "Conectar wallet";
  els.connectButton.disabled = busy || !isEthersLoaded();
  els.disconnectButton.classList.toggle("hidden", !connected);
  els.disconnectButton.disabled = busy || !connected;
  els.switchButton.textContent = appConfig.network.name;
  els.switchButton.classList.toggle("hidden", !connected || onTargetNetwork);
  els.switchButton.disabled = busy || !connected || onTargetNetwork;
  els.refreshButton.disabled = busy || !connected;

  const d = state.dashboard;
  els.metricBalance.textContent = `${formatToken(d?.tokenBalance, state.tokenDecimals)} ${state.tokenSymbol}`;
  els.metricStaked.textContent = `${formatToken(d?.stakedBalance, state.tokenDecimals)} ${state.tokenSymbol}`;
  els.metricRewards.textContent = `${formatToken(d?.earned, state.rewardDecimals)} ${state.rewardSymbol}`;
  els.metricFee.textContent = d ? `${Number(d.feeBps) / 100}%` : "-";
  els.metricVotingPower.textContent = `${formatToken(d?.votingPower, state.tokenDecimals)} ${state.tokenSymbol}`;
  els.metricTotalStaked.textContent = `${formatToken(d?.totalStaked, state.tokenDecimals)} ${state.tokenSymbol}`;
  els.unlockValue.textContent = d ? formatDate(d.unlockTime) : "-";
  renderStakingPanel(d);
  renderDaoPanel(d);
  renderWalletNfts();
  const txDisabled = busy || !connected || !onTargetNetwork || !deploymentReady;
  document.querySelectorAll(".main-area form button, .main-area .toolbar button").forEach((button) => {
    button.disabled = txDisabled;
  });
  els.saveFaucetButton.disabled = busy;
  els.refreshFaucetButton.disabled = txDisabled || !state.faucetAddress;
  els.claimFaucetButton.disabled = txDisabled || !state.faucetAddress;
  els.activateVotingButton.disabled = txDisabled || !d?.matured || !d?.pendingVotingPower;
  els.claimRewardsButton.disabled = txDisabled || !d?.earned;
  renderProposalActions(txDisabled);
  renderRealtimeCountdowns();
}

function renderDaoPanel(d) {
  const dao = state.daoConfig;
  const votingPower = d?.votingPower || 0n;
  const pendingVotingPower = d?.pendingVotingPower || 0n;
  const threshold = dao?.proposalThreshold;
  const canPropose = Boolean(threshold !== undefined && votingPower >= threshold);

  els.daoVotingPowerValue.textContent = `${formatToken(votingPower, state.tokenDecimals)} ${state.tokenSymbol}`;
  els.daoPendingVotingPowerValue.textContent = `${formatToken(pendingVotingPower, state.tokenDecimals)} ${state.tokenSymbol}`;
  els.daoThresholdValue.textContent = threshold === undefined
    ? "-"
    : `${formatToken(threshold, state.tokenDecimals)} ${state.tokenSymbol}`;
  els.daoQuorumValue.textContent = dao?.quorumBps === undefined ? "-" : `${Number(dao.quorumBps) / 100}%`;
  els.daoVotingPeriodValue.textContent = dao?.votingPeriod === undefined ? "-" : formatDuration(Number(dao.votingPeriod));
  els.daoReadyBadge.textContent = canPropose ? "pronto para criar" : "sem voto suficiente";
  els.daoReadyBadge.classList.toggle("muted", !canPropose);
}

function renderStakingPanel(d) {
  els.stakingPanelRewards.textContent = `${formatToken(d?.earned, state.rewardDecimals, 6)} ${state.rewardSymbol}`;
  els.stakingPanelRewardReserve.textContent = `${formatToken(d?.rewardReserve, state.rewardDecimals, 6)} ${state.rewardSymbol}`;
  els.stakingPanelRewardUpdated.textContent = state.lastDashboardUpdatedAt ? formatTimeAgo(state.lastDashboardUpdatedAt) : "-";
  els.stakingPanelStaked.textContent = `${formatToken(d?.stakedBalance, state.tokenDecimals)} ${state.tokenSymbol}`;
  els.stakingPanelVotingPower.textContent = `${formatToken(d?.votingPower, state.tokenDecimals)} ${state.tokenSymbol}`;
  els.stakingPanelPendingVotingPower.textContent = `${formatToken(d?.pendingVotingPower, state.tokenDecimals)} ${state.tokenSymbol}`;

  if (!d || !d.stakedBalance || d.stakedBalance === 0n) {
    els.stakingPanelUnlockAt.textContent = "-";
    clearCountdownElement(els.stakingPanelTimeLeft, "sem stake");
    return;
  }

  if (!d.pendingVotingPower || d.pendingVotingPower === 0n) {
    els.stakingPanelUnlockAt.textContent = "-";
    clearCountdownElement(els.stakingPanelTimeLeft, d.votingPower > 0n ? "voto ja ativo" : "sem pendencia");
    return;
  }

  els.stakingPanelUnlockAt.textContent = formatDate(d.unlockTime);

  if (d.matured) {
    clearCountdownElement(els.stakingPanelTimeLeft, "liberado agora");
    return;
  }

  setCountdownElement(els.stakingPanelTimeLeft, Number(d.unlockTime), "liberado agora");
}

function renderWalletNfts() {
  const guaranteeItems = state.nfts.guarantee || [];
  const yieldItems = state.nfts.yield || [];

  els.guaranteeNftCount.textContent = `${guaranteeItems.length} NFT${guaranteeItems.length === 1 ? "" : "s"}`;
  els.yieldNftCount.textContent = `${yieldItems.length} NFT${yieldItems.length === 1 ? "" : "s"}`;

  if (state.nfts.error) {
    const errorHtml = `<div class="empty-state">${escapeHtml(state.nfts.error)}</div>`;
    els.guaranteeNftList.innerHTML = errorHtml;
    els.yieldNftList.innerHTML = errorHtml;
    return;
  }

  els.guaranteeNftList.innerHTML = guaranteeItems.length
    ? guaranteeItems.map(renderGuaranteeNftItem).join("")
    : `<div class="empty-state">${state.nfts.loaded ? "Nenhum GuaranteeNFT encontrado para esta carteira." : "Conecte a wallet para carregar seus NFTs."}</div>`;

  els.yieldNftList.innerHTML = yieldItems.length
    ? yieldItems.map(renderYieldNftItem).join("")
    : `<div class="empty-state">${state.nfts.loaded ? "Nenhum YieldRightNFT encontrado para esta carteira." : "Conecte a wallet para carregar seus NFTs."}</div>`;
}

function renderGuaranteeNftItem(item) {
  const released = item.principalReleased;
  const ready = !released && item.unlockTime <= state.now;
  const amountText = released ? `0 ${state.rewardSymbol}` : `${formatToken(item.amountLocked, state.rewardDecimals, 6)} ${state.rewardSymbol}`;
  const status = released ? "pago" : ready ? "liberado" : "bloqueado";
  const actionDisabled = isWalletActionDisabled() || released || !ready;
  const actionLabel = released ? "Principal pago" : ready ? "Resgatar principal" : "Aguardando liberacao";

  return `
    <article class="nft-item">
      <div class="nft-item-header">
        <strong>Guarantee #${item.tokenId.toString()}</strong>
        <span class="badge ${ready ? "" : "muted"}" data-release-status="${item.unlockTime}" data-released="${released ? "true" : "false"}">${status}</span>
      </div>
      <dl class="details-list compact">
        <div>
          <dt>Valor a receber</dt>
          <dd>${amountText}</dd>
        </div>
        <div>
          <dt>Libera em</dt>
          <dd>${formatDate(item.unlockTime)}</dd>
        </div>
        <div>
          <dt>Tempo restante</dt>
          <dd data-countdown-time="${item.unlockTime}" data-done-text="liberado agora">${formatTimeLeft(item.unlockTime)}</dd>
        </div>
        <div>
          <dt>Yield NFT</dt>
          <dd>#${item.yieldRightTokenId.toString()}</dd>
        </div>
        <div>
          <dt>Empresa</dt>
          <dd>${shortAddress(item.employer)}</dd>
        </div>
      </dl>
      <div class="nft-actions">
        <button
          type="button"
          data-release-guarantee-id="${item.tokenId.toString()}"
          data-action-unlock-time="${item.unlockTime}"
          data-action-ready-label="Resgatar principal"
          data-action-pending-label="Aguardando liberacao"
          data-action-final-label="Principal pago"
          data-action-final="${released ? "true" : "false"}"
          data-action-has-balance="true"
          ${actionDisabled ? "disabled" : ""}
        >${actionLabel}</button>
        <button class="secondary" type="button" data-open-guarantee-id="${item.tokenId.toString()}" data-open-yield-id="${item.yieldRightTokenId.toString()}">Ver detalhes</button>
      </div>
    </article>
  `;
}

function renderYieldNftItem(item) {
  const ready = item.unlockTime <= state.now;
  const settled = item.principalReleased;
  const netText = settled ? `0 ${state.rewardSymbol}` : `${formatToken(item.claimableYield, state.rewardDecimals, 6)} ${state.rewardSymbol}`;
  const hasYield = !settled && item.claimableYield > 0n;
  const actionDisabled = isWalletActionDisabled() || settled || !ready || !hasYield;
  const actionLabel = settled
    ? "Yield encerrado"
    : !ready
      ? "Aguardando resgate"
      : hasYield
        ? "Resgatar yield"
        : "Sem yield disponivel";
  const statusLabel = settled ? "encerrado" : ready ? "resgatavel" : "aguardando";

  return `
    <article class="nft-item">
      <div class="nft-item-header">
        <strong>Yield #${item.tokenId.toString()}</strong>
        <span class="badge ${ready && !settled ? "" : "muted"}" data-release-status="${item.unlockTime}" data-released="${settled ? "true" : "false"}" data-ready-label="resgatavel" data-pending-label="aguardando" data-final-label="encerrado">${statusLabel}</span>
      </div>
      <dl class="details-list compact">
        <div>
          <dt>Yield liquido</dt>
          <dd>${netText}</dd>
        </div>
        <div>
          <dt>Principal ligado</dt>
          <dd>${formatToken(item.amountLocked, state.rewardDecimals, 6)} ${state.rewardSymbol}</dd>
        </div>
        <div>
          <dt>Libera em</dt>
          <dd>${formatDate(item.unlockTime)}</dd>
        </div>
        <div>
          <dt>Tempo restante</dt>
          <dd data-countdown-time="${item.unlockTime}" data-done-text="liberado agora">${formatTimeLeft(item.unlockTime)}</dd>
        </div>
        <div>
          <dt>Guarantee NFT</dt>
          <dd>#${item.guaranteeTokenId.toString()}</dd>
        </div>
      </dl>
      <div class="nft-actions">
        <button
          type="button"
          data-claim-yield-id="${item.tokenId.toString()}"
          data-action-unlock-time="${item.unlockTime}"
          data-action-ready-label="Resgatar yield"
          data-action-pending-label="Aguardando resgate"
          data-action-empty-label="Sem yield disponivel"
          data-action-final-label="Yield encerrado"
          data-action-final="${settled ? "true" : "false"}"
          data-action-has-balance="${hasYield ? "true" : "false"}"
          ${actionDisabled ? "disabled" : ""}
        >${actionLabel}</button>
        <button class="secondary" type="button" data-open-guarantee-id="${item.guaranteeTokenId.toString()}" data-open-yield-id="${item.tokenId.toString()}">Ver detalhes</button>
      </div>
    </article>
  `;
}

function renderProposalActions(txDisabled = isWalletActionDisabled()) {
  const proposal = state.currentProposal;
  const dao = state.daoConfig;
  const votingPower = state.dashboard?.votingPower || 0n;
  const threshold = dao?.proposalThreshold;
  const canCreate = Boolean(threshold !== undefined && votingPower >= threshold);
  const canCancel = Boolean(
    proposal
      && proposal.status !== 4
      && proposal.status !== 5
      && (
        sameAddress(proposal.proposer, state.account)
        || sameAddress(dao?.owner, state.account)
      ),
  );

  els.createProposalButton.disabled = txDisabled || !canCreate;
  els.voteForButton.disabled = txDisabled || !proposal || proposal.status !== 1;
  els.voteAgainstButton.disabled = txDisabled || !proposal || proposal.status !== 1;
  els.executeProposalButton.disabled = txDisabled || !proposal || proposal.status !== 3;
  els.cancelProposalButton.disabled = txDisabled || !canCancel;
}

function onNftListClick(event) {
  const button = event.target.closest("button[data-release-guarantee-id], button[data-claim-yield-id], button[data-open-guarantee-id], button[data-open-yield-id]");
  if (!button) return;

  if (button.dataset.releaseGuaranteeId) {
    releasePaymentToken(BigInt(button.dataset.releaseGuaranteeId));
    return;
  }

  if (button.dataset.claimYieldId) {
    claimYieldToken(BigInt(button.dataset.claimYieldId));
    return;
  }

  const guaranteeId = button.dataset.openGuaranteeId;
  const yieldId = button.dataset.openYieldId;
  if (guaranteeId) els.guaranteeTokenId.value = guaranteeId;
  if (yieldId) els.yieldTokenId.value = yieldId;

  setView("escrow");
  onLookupService(new Event("submit"));
}

function isWalletActionDisabled() {
  return state.busyCount > 0 || !state.account || !isTargetNetwork() || !hasDeployment();
}

function renderContracts() {
  const configuredContracts = Object.values(contracts)
    .filter((item) => item.address);

  if (state.faucetAddress && state.faucetAddress !== contracts.faucet?.address) {
    configuredContracts.push({ label: "TestTgtFaucet", address: state.faucetAddress });
  }

  if (configuredContracts.length === 0) {
    els.contractsTable.innerHTML = `
      <div class="empty-state">
        Rode o deploy na ${appConfig.network.name} e depois sincronize o frontend com npm run frontend:sync:base-sepolia.
      </div>
    `;
    return;
  }

  els.contractsTable.innerHTML = configuredContracts.map((item) => `
    <div class="contract-row">
      <div>
        <strong>${item.label}</strong>
        <code>${item.address}</code>
      </div>
      <div class="contract-actions">
        <button class="secondary" type="button" data-copy="${item.address}">Copiar</button>
        <a href="${appConfig.network.explorerAddressUrl}${item.address}" target="_blank" rel="noreferrer">Explorer</a>
      </div>
    </div>
  `).join("");

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.copy);
      showMessage("Endereco copiado.", "success");
    });
  });
}

function getContracts() {
  requireWallet();
  if (!hasDeployment()) {
    throw new Error("Enderecos do deploy ainda nao sincronizados no frontend.");
  }

  return {
    token: new ethers.Contract(contracts.governanceToken.address, erc20Abi, state.signer),
    staking: new ethers.Contract(contracts.staking.address, stakingAbi, state.signer),
    escrow: new ethers.Contract(contracts.escrow.address, escrowAbi, state.signer),
    dao: new ethers.Contract(contracts.dao.address, daoAbi, state.signer),
    guaranteeNft: new ethers.Contract(contracts.guaranteeNft.address, guaranteeNftAbi, state.signer),
    yieldRightNft: new ethers.Contract(contracts.yieldRightNft.address, yieldRightNftAbi, state.signer),
  };
}

function getFaucetContract() {
  requireWallet();
  assertAddress(state.faucetAddress, "Faucet");
  return new ethers.Contract(state.faucetAddress, faucetAbi, state.signer);
}

async function ensureAllowance({ token, owner, spender, amount, decimals, symbol, approveLabel }) {
  const currentAllowance = await token.allowance(owner, spender);
  if (currentAllowance >= amount) {
    return false;
  }

  showMessage(
    `Etapa 1/2: autorize ${formatToken(amount, decimals)} ${symbol} para ${approveLabel} na MetaMask.`,
    "pending",
  );
  const approveTx = await token.approve(spender, amount);

  showMessage("Aprovacao enviada. Aguardando confirmacao on-chain...", "pending");
  await approveTx.wait();
  await waitForAllowance(token, owner, spender, amount);

  return true;
}

async function waitForAllowance(token, owner, spender, amount) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const allowance = await token.allowance(owner, spender);
    if (allowance >= amount) {
      return allowance;
    }
    await sleep(1250);
  }

  throw new Error("Aprovacao confirmada, mas a allowance ainda nao apareceu no RPC. Aguarde alguns segundos e tente de novo.");
}

async function runTx(label, task) {
  return runTask(label, async () => {
    requireWallet();
    if (!isTargetNetwork()) throw new Error(`Troque a wallet para ${appConfig.network.name}.`);
    if (!hasDeployment()) throw new Error("Rode o deploy na Base Sepolia e depois npm run frontend:sync:base-sepolia.");
    return task();
  });
}

async function runTask(label, task, { successMessage = "Operacao concluida." } = {}) {
  showMessage(`${label}...`, "pending");
  setBusy(true);
  try {
    const result = await task();
    if (successMessage) showMessage(successMessage, "success");
    return result;
  } catch (err) {
    showMessage(readError(err), "error");
    return null;
  } finally {
    setBusy(false);
    render();
  }
}

function setBusy(isBusy) {
  state.busyCount = isBusy
    ? state.busyCount + 1
    : Math.max(0, state.busyCount - 1);

  document.body.classList.toggle("is-busy", state.busyCount > 0);
  render();
}

function showMessage(text, kind = "info") {
  els.message.textContent = text;
  els.message.className = `message ${kind}`;
}

function hideMessage() {
  els.message.className = "message hidden";
}

function startRealtimeClock() {
  setInterval(() => {
    state.now = Math.floor(Date.now() / 1000);
    renderRealtimeCountdowns();
  }, 1000);
}

function startDashboardAutoRefresh() {
  setInterval(async () => {
    if (
      document.visibilityState === "hidden"
      || state.autoRefreshInFlight
      || state.busyCount > 0
      || !state.account
      || !isTargetNetwork()
      || !hasDeployment()
    ) {
      return;
    }

    state.autoRefreshInFlight = true;
    try {
      await Promise.all([
        loadDashboard(),
        refreshNftRuntimeData(),
        state.currentProposal ? readProposalById(state.currentProposal.id) : Promise.resolve(),
      ]);
      render();
    } catch (_err) {
      // Background refresh should never interrupt the current user flow.
    } finally {
      state.autoRefreshInFlight = false;
    }
  }, 8000);
}

function renderRealtimeCountdowns() {
  document.querySelectorAll("[data-countdown-time]").forEach((element) => {
    const unlockTime = Number(element.dataset.countdownTime);
    const doneText = element.dataset.doneText || "liberado agora";
    const includeDate = element.dataset.includeDate === "true";
    element.textContent = includeDate
      ? `${formatDate(unlockTime)} (${formatTimeLeft(unlockTime, doneText)})`
      : formatTimeLeft(unlockTime, doneText);
  });

  document.querySelectorAll("[data-release-status]").forEach((element) => {
    const released = element.dataset.released === "true";
    const unlockTime = Number(element.dataset.releaseStatus);
    const ready = unlockTime <= state.now;
    const readyLabel = element.dataset.readyLabel || "liberado";
    const pendingLabel = element.dataset.pendingLabel || "bloqueado";
    const finalLabel = element.dataset.finalLabel || "pago";
    element.textContent = released ? finalLabel : ready ? readyLabel : pendingLabel;
    element.classList.toggle("muted", !ready || released);
  });

  document.querySelectorAll("[data-action-unlock-time]").forEach((button) => {
    const final = button.dataset.actionFinal === "true";
    const hasBalance = button.dataset.actionHasBalance !== "false";
    const ready = Number(button.dataset.actionUnlockTime) <= state.now;
    const blocked = final || !hasBalance || !ready || isWalletActionDisabled();

    button.disabled = blocked;
    if (final) {
      button.textContent = button.dataset.actionFinalLabel || "Concluido";
    } else if (!ready) {
      button.textContent = button.dataset.actionPendingLabel || "Aguardando";
    } else if (!hasBalance) {
      button.textContent = button.dataset.actionEmptyLabel || "Sem valor disponivel";
    } else {
      button.textContent = button.dataset.actionReadyLabel || "Resgatar";
    }
  });

  if (state.dashboard) {
    els.stakingPanelRewardUpdated.textContent = state.lastDashboardUpdatedAt ? formatTimeAgo(state.lastDashboardUpdatedAt) : "-";
  }
}

function setCountdownElement(element, unlockTime, doneText = "liberado agora", includeDate = false) {
  element.dataset.countdownTime = String(unlockTime);
  element.dataset.doneText = doneText;
  element.dataset.includeDate = includeDate ? "true" : "false";
  element.textContent = includeDate
    ? `${formatDate(unlockTime)} (${formatTimeLeft(unlockTime, doneText)})`
    : formatTimeLeft(unlockTime, doneText);
}

function clearCountdownElement(element, text) {
  delete element.dataset.countdownTime;
  delete element.dataset.doneText;
  delete element.dataset.includeDate;
  element.textContent = text;
}

function isEthersLoaded() {
  return typeof ethers?.isAddress === "function";
}

function isValidAddress(address) {
  return isEthersLoaded() && ethers.isAddress(address);
}

function isTargetNetwork() {
  return state.chainId === BigInt(appConfig.network.chainId);
}

function hasDeployment() {
  return [
    contracts.priceOracle?.address,
    contracts.guaranteeNft?.address,
    contracts.governanceToken?.address,
    contracts.yieldRightNft?.address,
    contracts.staking?.address,
    contracts.escrow?.address,
    contracts.dao?.address,
  ].every((address) => isValidAddress(address));
}

function requireWallet() {
  if (!state.signer) throw new Error("Conecte a wallet primeiro.");
}

function valueOf(id) {
  return els[id].value.trim();
}

function parseTokenAmount(value, decimals) {
  if (!value || Number(value) <= 0) throw new Error("Informe uma quantidade valida.");
  return ethers.parseUnits(value.replace(",", "."), decimals);
}

function parseIntegerInRange(value, min, max, label) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${label} precisa ser um numero inteiro.`);
  }

  const parsed = BigInt(value);
  if (parsed < min || parsed > max) {
    throw new Error(`${label} precisa ficar entre ${min} e ${max}.`);
  }

  return parsed;
}

function assertAddress(value, label) {
  if (!isValidAddress(value)) throw new Error(`${label} invalido.`);
}

function sameAddress(left, right) {
  return String(left).toLowerCase() === String(right).toLowerCase();
}

function compareBigInt(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function getPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatToken(value, decimals = 18, digits = 4) {
  if (value === undefined || value === null) return "-";
  const formatted = ethers.formatUnits(value, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  return fraction ? `${whole}.${fraction.slice(0, digits)}` : whole;
}

function formatDate(value) {
  const seconds = Number(value || 0);
  if (!seconds) return "-";
  return new Date(seconds * 1000).toLocaleString("pt-BR");
}

function formatTimeLeft(unlockTime, doneText = "liberado agora") {
  const secondsLeft = Number(unlockTime || 0) - state.now;
  if (secondsLeft <= 0) return doneText;
  return formatDuration(secondsLeft);
}

function formatTimeAgo(timestamp) {
  const secondsAgo = Math.max(0, state.now - Number(timestamp || 0));
  if (secondsAgo < 5) return "agora";
  return `${formatDuration(secondsAgo)} atras`;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  if (seconds <= 0) return "liberado agora";
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds ? `${minutes}min ${remainingSeconds}s` : `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
}

function shortAddress(address) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getErrorText(err) {
  return [
    err?.shortMessage,
    err?.reason,
    err?.message,
    err?.info?.error?.message,
    err?.error?.message,
    err?.data,
    err?.data?.data,
    err?.info?.error?.data,
    err?.info?.error?.data?.data,
    err?.error?.data,
    err?.error?.data?.data,
  ].filter(Boolean).map((item) => {
    if (typeof item === "string") return item;
    try {
      return JSON.stringify(item);
    } catch (_err) {
      return String(item);
    }
  }).filter(Boolean).join(" ");
}

function isRpcPayloadTooLargeError(err) {
  const statuses = [
    err?.data?.httpStatus,
    err?.data?.data?.httpStatus,
    err?.error?.data?.httpStatus,
    err?.error?.data?.data?.httpStatus,
    err?.info?.error?.data?.httpStatus,
    err?.info?.error?.data?.data?.httpStatus,
  ].map(Number);

  if (statuses.includes(413)) return true;

  const text = getErrorText(err).toLowerCase();
  return text.includes('"httpstatus":413')
    || text.includes("http status 413")
    || text.includes("request entity too large")
    || text.includes("payload too large");
}

function readError(err) {
  const text = getErrorText(err);

  const aaveCodeMatch = text.match(/execution reverted: ["']?(\d+)["']?/i);
  if (aaveCodeMatch) {
    const message = aaveErrorMessages[Number(aaveCodeMatch[1])];
    if (message) return message;
  }

  if (text.includes("Invalid lock duration")) {
    return "Duracao do escrow precisa ficar entre 1 e 60 minutos no modo teste.";
  }

  if (text.includes("transfer amount exceeds allowance")) {
    return "Allowance insuficiente: confirme primeiro a aprovacao na MetaMask, aguarde a confirmacao on-chain e depois confirme a transacao principal.";
  }

  if (text.includes("0x47bc4b2c")) {
    return aaveErrorMessages["0x47bc4b2c"];
  }

  if (isRpcPayloadTooLargeError(err)) {
    return "RPC da wallet recusou uma consulta de eventos muito grande (HTTP 413). O app tentou reduzir o tamanho da busca; se persistir, use um RPC dedicado ou diminua indexing.logChunkSize no deployment.json.";
  }

  return err?.shortMessage || err?.reason || err?.message || "Erro desconhecido.";
}

function readProposalIdFromReceipt(receipt) {
  const event = receipt.logs
    .map((log) => {
      try {
        return getContracts().dao.interface.parseLog(log);
      } catch (_err) {
        return null;
      }
    })
    .find((parsed) => parsed?.name === "ProposalCreated");

  return event?.args?.proposalId?.toString();
}
