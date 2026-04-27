'solc --version' running
'solc @openzeppelin=node_modules/@openzeppelin @chainlink=node_modules/@chainlink contracts/ChainlinkPriceOracle.sol --combined-json abi,ast,bin,bin-runtime,srcmap,srcmap-runtime,userdoc,devdoc,hashes --optimize --via-ir --allow-paths .,/mnt/c/Users/mhbs/Documents/Tesserate,/mnt/c/Users/mhbs/Documents/Tesserate/contracts,/mnt/c/Users/mhbs/Documents/Tesserate/node_modules' running
'solc --version' running
'solc @openzeppelin=node_modules/@openzeppelin @chainlink=node_modules/@chainlink contracts/EscrowVault.sol --combined-json abi,ast,bin,bin-runtime,srcmap,srcmap-runtime,userdoc,devdoc,hashes --optimize --via-ir --allow-paths .,/mnt/c/Users/mhbs/Documents/Tesserate,/mnt/c/Users/mhbs/Documents/Tesserate/contracts,/mnt/c/Users/mhbs/Documents/Tesserate/node_modules' running
'solc --version' running
'solc @openzeppelin=node_modules/@openzeppelin @chainlink=node_modules/@chainlink contracts/GuaranteeNFT.sol --combined-json abi,ast,bin,bin-runtime,srcmap,srcmap-runtime,userdoc,devdoc,hashes --optimize --via-ir --allow-paths .,/mnt/c/Users/mhbs/Documents/Tesserate,/mnt/c/Users/mhbs/Documents/Tesserate/contracts,/mnt/c/Users/mhbs/Documents/Tesserate/node_modules' running
'solc --version' running
'solc @openzeppelin=node_modules/@openzeppelin @chainlink=node_modules/@chainlink contracts/TesserateGovernanceToken.sol --combined-json abi,ast,bin,bin-runtime,srcmap,srcmap-runtime,userdoc,devdoc,hashes --optimize --via-ir --allow-paths .,/mnt/c/Users/mhbs/Documents/Tesserate,/mnt/c/Users/mhbs/Documents/Tesserate/contracts,/mnt/c/Users/mhbs/Documents/Tesserate/node_modules' running
'solc --version' running
'solc @openzeppelin=node_modules/@openzeppelin @chainlink=node_modules/@chainlink contracts/TestTgtFaucet.sol --combined-json abi,ast,bin,bin-runtime,srcmap,srcmap-runtime,userdoc,devdoc,hashes --optimize --via-ir --allow-paths .,/mnt/c/Users/mhbs/Documents/Tesserate,/mnt/c/Users/mhbs/Documents/Tesserate/contracts,/mnt/c/Users/mhbs/Documents/Tesserate/node_modules' running
'solc --version' running
'solc @openzeppelin=node_modules/@openzeppelin @chainlink=node_modules/@chainlink contracts/TgtDao.sol --combined-json abi,ast,bin,bin-runtime,srcmap,srcmap-runtime,userdoc,devdoc,hashes --optimize --via-ir --allow-paths .,/mnt/c/Users/mhbs/Documents/Tesserate,/mnt/c/Users/mhbs/Documents/Tesserate/contracts,/mnt/c/Users/mhbs/Documents/Tesserate/node_modules' running
'solc --version' running
'solc @openzeppelin=node_modules/@openzeppelin @chainlink=node_modules/@chainlink contracts/TGTStaking.sol --combined-json abi,ast,bin,bin-runtime,srcmap,srcmap-runtime,userdoc,devdoc,hashes --optimize --via-ir --allow-paths .,/mnt/c/Users/mhbs/Documents/Tesserate,/mnt/c/Users/mhbs/Documents/Tesserate/contracts,/mnt/c/Users/mhbs/Documents/Tesserate/node_modules' running
'solc --version' running
'solc @openzeppelin=node_modules/@openzeppelin @chainlink=node_modules/@chainlink contracts/YieldRightNFT.sol --combined-json abi,ast,bin,bin-runtime,srcmap,srcmap-runtime,userdoc,devdoc,hashes --optimize --via-ir --allow-paths .,/mnt/c/Users/mhbs/Documents/Tesserate,/mnt/c/Users/mhbs/Documents/Tesserate/contracts,/mnt/c/Users/mhbs/Documents/Tesserate/node_modules' running
INFO:Detectors:
Detector: unused-return
ChainlinkPriceOracle.getLatestPrice(address) (contracts/ChainlinkPriceOracle.sol#47-58) ignores return value by (None,answer,None,answerUpdatedAt,None) = feed.latestRoundData() (contracts/ChainlinkPriceOracle.sol#51)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#unused-return
INFO:Detectors:
Detector: timestamp
ChainlinkPriceOracle.getLatestPrice(address) (contracts/ChainlinkPriceOracle.sol#47-58) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(block.timestamp - answerUpdatedAt <= maxPriceAge,Stale oracle price) (contracts/ChainlinkPriceOracle.sol#55)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#block-timestamp
INFO:Detectors:
Detector: reentrancy-no-eth
Reentrancy in EscrowVault.releasePayment(uint256) (contracts/EscrowVault.sol#336-359):
	External calls:
	- _settleYield(_guaranteeTokenId,service.yieldRightTokenId,service,yieldOwner,false) (contracts/EscrowVault.sol#347)
		- require(bool,string)(aavePool.withdraw(service.paymentToken,claimableYieldGross,address(this)) >= claimableYieldGross,Insufficient yield withdrawn) (contracts/EscrowVault.sol#441-444)
		- stakingRewardsContract.notifyRewardAmount(stakingRewardsAmount) (contracts/EscrowVault.sol#460)
	State variables written after the call(s):
	- service.principalReleased = true (contracts/EscrowVault.sol#349)
	EscrowVault.services (contracts/EscrowVault.sol#107) can be used in cross function reentrancies:
	- EscrowVault.getClaimableYield(uint256) (contracts/EscrowVault.sol#378-397)
	- EscrowVault.getClaimableYieldGross(uint256) (contracts/EscrowVault.sol#247-259)
	- EscrowVault.services (contracts/EscrowVault.sol#107)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-2
INFO:Detectors:
Detector: reentrancy-benign
Reentrancy in EscrowVault.deposit(address,address,uint256,uint256) (contracts/EscrowVault.sol#273-332):
	External calls:
	- aavePool.supply(address(usdcToken),_amount,address(this),0) (contracts/EscrowVault.sol#298)
	- guaranteeTokenId = nftContract.mintGuarantee(_employee) (contracts/EscrowVault.sol#300)
	- yieldRightTokenId = yieldRightNftContract.mintYieldRight(msg.sender) (contracts/EscrowVault.sol#301)
	State variables written after the call(s):
	- services[guaranteeTokenId] = Service({employer:msg.sender,employee:_employee,paymentToken:address(usdcToken),amountLocked:_amount,startTime:block.timestamp,lockDuration:lockDuration,yieldRightTokenId:yieldRightTokenId,startIncomeIndex:startIncomeIndex,claimedYield:0,principalReleased:false}) (contracts/EscrowVault.sol#307-318)
	- yieldRightToGuaranteeToken[yieldRightTokenId] = guaranteeTokenId (contracts/EscrowVault.sol#320)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-3
INFO:Detectors:
Detector: timestamp
EscrowVault.getClaimableYieldGross(uint256) (contracts/EscrowVault.sol#247-259) uses timestamp for comparisons
	Dangerous comparisons:
	- block.timestamp < service.startTime + service.lockDuration (contracts/EscrowVault.sol#254)
EscrowVault.releasePayment(uint256) (contracts/EscrowVault.sol#336-359) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(service.employer != address(0),Service not found) (contracts/EscrowVault.sol#339)
	- require(bool,string)(! service.principalReleased,Payment already released) (contracts/EscrowVault.sol#340)
	- require(bool,string)(block.timestamp >= service.startTime + service.lockDuration,Time lock not expired) (contracts/EscrowVault.sol#341)
	- require(bool,string)(withdrawnAmount >= service.amountLocked,Insufficient amount withdrawn) (contracts/EscrowVault.sol#352)
EscrowVault.claimYield(uint256) (contracts/EscrowVault.sol#363-374) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(service.employer != address(0),Service not found) (contracts/EscrowVault.sol#367)
	- require(bool,string)(service.yieldRightTokenId == _yieldRightTokenId,Invalid yield right token) (contracts/EscrowVault.sol#368)
	- require(bool,string)(! service.principalReleased,Yield already settled) (contracts/EscrowVault.sol#369)
	- require(bool,string)(block.timestamp >= service.startTime + service.lockDuration,Time lock not expired) (contracts/EscrowVault.sol#370)
EscrowVault.getClaimableYield(uint256) (contracts/EscrowVault.sol#378-397) uses timestamp for comparisons
	Dangerous comparisons:
	- block.timestamp < service.startTime + service.lockDuration (contracts/EscrowVault.sol#388)
EscrowVault._settleYield(uint256,uint256,EscrowVault.Service,address,bool) (contracts/EscrowVault.sol#426-481) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(aavePool.withdraw(service.paymentToken,claimableYieldGross,address(this)) >= claimableYieldGross,Insufficient yield withdrawn) (contracts/EscrowVault.sol#441-444)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#block-timestamp
INFO:Detectors:
Detector: naming-convention
Parameter EscrowVault.setGovernanceToken(address)._governanceTokenAddress (contracts/EscrowVault.sol#192) is not in mixedCase
Parameter EscrowVault.setPlatformFeeRecipient(address)._newRecipient (contracts/EscrowVault.sol#203) is not in mixedCase
Parameter EscrowVault.setStakingRewardsContract(address)._newContract (contracts/EscrowVault.sol#214) is not in mixedCase
Parameter EscrowVault.getClaimableYieldGross(uint256)._yieldRightTokenId (contracts/EscrowVault.sol#247) is not in mixedCase
Parameter EscrowVault.getDepositUsdValue(address,uint256)._paymentToken (contracts/EscrowVault.sol#263) is not in mixedCase
Parameter EscrowVault.getDepositUsdValue(address,uint256)._amount (contracts/EscrowVault.sol#263) is not in mixedCase
Parameter EscrowVault.deposit(address,address,uint256,uint256)._employee (contracts/EscrowVault.sol#274) is not in mixedCase
Parameter EscrowVault.deposit(address,address,uint256,uint256)._paymentToken (contracts/EscrowVault.sol#275) is not in mixedCase
Parameter EscrowVault.deposit(address,address,uint256,uint256)._amount (contracts/EscrowVault.sol#276) is not in mixedCase
Parameter EscrowVault.deposit(address,address,uint256,uint256)._durationUnits (contracts/EscrowVault.sol#277) is not in mixedCase
Parameter EscrowVault.releasePayment(uint256)._guaranteeTokenId (contracts/EscrowVault.sol#336) is not in mixedCase
Parameter EscrowVault.claimYield(uint256)._yieldRightTokenId (contracts/EscrowVault.sol#363) is not in mixedCase
Parameter EscrowVault.getClaimableYield(uint256)._yieldRightTokenId (contracts/EscrowVault.sol#378) is not in mixedCase
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#conformance-to-solidity-naming-conventions
INFO:Detectors:
Detector: immutable-states
EscrowVault.aavePool (contracts/EscrowVault.sol#113) should be immutable 
EscrowVault.nftContract (contracts/EscrowVault.sol#110) should be immutable 
EscrowVault.priceOracle (contracts/EscrowVault.sol#114) should be immutable 
EscrowVault.yieldRightNftContract (contracts/EscrowVault.sol#111) should be immutable 
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#state-variables-that-could-be-declared-immutable
INFO:Detectors:
Detector: naming-convention
Parameter GuaranteeNFT.setEscrowVault(address)._escrow (contracts/GuaranteeNFT.sol#25) is not in mixedCase
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#conformance-to-solidity-naming-conventions
INFO:Detectors:
Detector: timestamp
TestTgtFaucet.claim() (contracts/TestTgtFaucet.sol#38-47) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(block.timestamp >= nextClaimAt,Cooldown active) (contracts/TestTgtFaucet.sol#40)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#block-timestamp
INFO:Detectors:
Detector: timestamp
TgtDao.vote(uint256,bool) (contracts/TgtDao.sol#182-206) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(proposal.id != 0,Proposal not found) (contracts/TgtDao.sol#184)
	- require(bool,string)(votingPowerActivatedAt != 0 && votingPowerActivatedAt <= proposal.startTime,Voting power was not active at proposal start) (contracts/TgtDao.sol#189-192)
TgtDao.execute(uint256) (contracts/TgtDao.sol#210-222) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(proposal.id != 0,Proposal not found) (contracts/TgtDao.sol#212)
TgtDao.cancel(uint256) (contracts/TgtDao.sol#226-234) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(proposal.id != 0,Proposal not found) (contracts/TgtDao.sol#228)
	- require(bool,string)(! proposal.executed,Proposal already executed) (contracts/TgtDao.sol#229)
	- require(bool,string)(msg.sender == proposal.proposer || msg.sender == owner(),Not authorized) (contracts/TgtDao.sol#230)
TgtDao.state(uint256) (contracts/TgtDao.sol#251-275) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(proposal.id != 0,Proposal not found) (contracts/TgtDao.sol#253)
	- block.timestamp < proposal.startTime (contracts/TgtDao.sol#261)
	- block.timestamp <= proposal.endTime (contracts/TgtDao.sol#264)
TgtDao.getProposalSummary(uint256) (contracts/TgtDao.sol#279-312) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(proposal.id != 0,Proposal not found) (contracts/TgtDao.sol#298)
TgtDao.getProposalPayload(uint256) (contracts/TgtDao.sol#316-322) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(proposal.id != 0,Proposal not found) (contracts/TgtDao.sol#320)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#block-timestamp
INFO:Detectors:
Detector: low-level-calls
Low level call in TgtDao.execute(uint256) (contracts/TgtDao.sol#210-222):
	- (success,returndata) = proposal.target.call{value: proposal.value}(proposal.data) (contracts/TgtDao.sol#217)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#low-level-calls
INFO:Detectors:
Detector: timestamp
TGTStaking.hasMaturedStake(address) (contracts/TGTStaking.sol#239-242) uses timestamp for comparisons
	Dangerous comparisons:
	- pendingVotingPower(account) > 0 && startedAt != 0 && block.timestamp >= startedAt + VOTING_POWER_DELAY (contracts/TGTStaking.sol#241)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#block-timestamp
INFO:Detectors:
Detector: naming-convention
Variable TGTStaking.VOTING_POWER_DELAY (contracts/TGTStaking.sol#14) is not in mixedCase
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#conformance-to-solidity-naming-conventions
INFO:Detectors:
Detector: naming-convention
Parameter YieldRightNFT.setEscrowVault(address)._escrow (contracts/YieldRightNFT.sol#22) is not in mixedCase
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#conformance-to-solidity-naming-conventions
**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary
 - [unused-return](#unused-return) (1 results) (Medium)
 - [timestamp](#timestamp) (14 results) (Low)
 - [reentrancy-no-eth](#reentrancy-no-eth) (1 results) (Medium)
 - [reentrancy-benign](#reentrancy-benign) (1 results) (Low)
 - [naming-convention](#naming-convention) (16 results) (Informational)
 - [immutable-states](#immutable-states) (4 results) (Optimization)
 - [low-level-calls](#low-level-calls) (1 results) (Informational)
## unused-return
Impact: Medium
Confidence: Medium
 - [ ] ID-0
[ChainlinkPriceOracle.getLatestPrice(address)](contracts/ChainlinkPriceOracle.sol#L47-L58) ignores return value by [(None,answer,None,answerUpdatedAt,None) = feed.latestRoundData()](contracts/ChainlinkPriceOracle.sol#L51)

contracts/ChainlinkPriceOracle.sol#L47-L58


## timestamp
Impact: Low
Confidence: Medium
 - [ ] ID-1
[ChainlinkPriceOracle.getLatestPrice(address)](contracts/ChainlinkPriceOracle.sol#L47-L58) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(block.timestamp - answerUpdatedAt <= maxPriceAge,Stale oracle price)](contracts/ChainlinkPriceOracle.sol#L55)

contracts/ChainlinkPriceOracle.sol#L47-L58


 - [ ] ID-2
[EscrowVault.releasePayment(uint256)](contracts/EscrowVault.sol#L336-L359) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(service.employer != address(0),Service not found)](contracts/EscrowVault.sol#L339)
	- [require(bool,string)(! service.principalReleased,Payment already released)](contracts/EscrowVault.sol#L340)
	- [require(bool,string)(block.timestamp >= service.startTime + service.lockDuration,Time lock not expired)](contracts/EscrowVault.sol#L341)
	- [require(bool,string)(withdrawnAmount >= service.amountLocked,Insufficient amount withdrawn)](contracts/EscrowVault.sol#L352)

contracts/EscrowVault.sol#L336-L359


 - [ ] ID-3
[EscrowVault.claimYield(uint256)](contracts/EscrowVault.sol#L363-L374) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(service.employer != address(0),Service not found)](contracts/EscrowVault.sol#L367)
	- [require(bool,string)(service.yieldRightTokenId == _yieldRightTokenId,Invalid yield right token)](contracts/EscrowVault.sol#L368)
	- [require(bool,string)(! service.principalReleased,Yield already settled)](contracts/EscrowVault.sol#L369)
	- [require(bool,string)(block.timestamp >= service.startTime + service.lockDuration,Time lock not expired)](contracts/EscrowVault.sol#L370)

contracts/EscrowVault.sol#L363-L374


 - [ ] ID-4
[EscrowVault.getClaimableYield(uint256)](contracts/EscrowVault.sol#L378-L397) uses timestamp for comparisons
	Dangerous comparisons:
	- [block.timestamp < service.startTime + service.lockDuration](contracts/EscrowVault.sol#L388)

contracts/EscrowVault.sol#L378-L397


 - [ ] ID-5
[EscrowVault.getClaimableYieldGross(uint256)](contracts/EscrowVault.sol#L247-L259) uses timestamp for comparisons
	Dangerous comparisons:
	- [block.timestamp < service.startTime + service.lockDuration](contracts/EscrowVault.sol#L254)

contracts/EscrowVault.sol#L247-L259


 - [ ] ID-6
[EscrowVault._settleYield(uint256,uint256,EscrowVault.Service,address,bool)](contracts/EscrowVault.sol#L426-L481) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(aavePool.withdraw(service.paymentToken,claimableYieldGross,address(this)) >= claimableYieldGross,Insufficient yield withdrawn)](contracts/EscrowVault.sol#L441-L444)

contracts/EscrowVault.sol#L426-L481


 - [ ] ID-7
[TestTgtFaucet.claim()](contracts/TestTgtFaucet.sol#L38-L47) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(block.timestamp >= nextClaimAt,Cooldown active)](contracts/TestTgtFaucet.sol#L40)

contracts/TestTgtFaucet.sol#L38-L47


 - [ ] ID-8
[TgtDao.getProposalPayload(uint256)](contracts/TgtDao.sol#L316-L322) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(proposal.id != 0,Proposal not found)](contracts/TgtDao.sol#L320)

contracts/TgtDao.sol#L316-L322


 - [ ] ID-9
[TgtDao.cancel(uint256)](contracts/TgtDao.sol#L226-L234) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(proposal.id != 0,Proposal not found)](contracts/TgtDao.sol#L228)
	- [require(bool,string)(! proposal.executed,Proposal already executed)](contracts/TgtDao.sol#L229)
	- [require(bool,string)(msg.sender == proposal.proposer || msg.sender == owner(),Not authorized)](contracts/TgtDao.sol#L230)

contracts/TgtDao.sol#L226-L234


 - [ ] ID-10
[TgtDao.getProposalSummary(uint256)](contracts/TgtDao.sol#L279-L312) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(proposal.id != 0,Proposal not found)](contracts/TgtDao.sol#L298)

contracts/TgtDao.sol#L279-L312


 - [ ] ID-11
[TgtDao.execute(uint256)](contracts/TgtDao.sol#L210-L222) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(proposal.id != 0,Proposal not found)](contracts/TgtDao.sol#L212)

contracts/TgtDao.sol#L210-L222


 - [ ] ID-12
[TgtDao.vote(uint256,bool)](contracts/TgtDao.sol#L182-L206) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(proposal.id != 0,Proposal not found)](contracts/TgtDao.sol#L184)
	- [require(bool,string)(votingPowerActivatedAt != 0 && votingPowerActivatedAt <= proposal.startTime,Voting power was not active at proposal start)](contracts/TgtDao.sol#L189-L192)

contracts/TgtDao.sol#L182-L206


 - [ ] ID-13
[TgtDao.state(uint256)](contracts/TgtDao.sol#L251-L275) uses timestamp for comparisons
	Dangerous comparisons:
	- [require(bool,string)(proposal.id != 0,Proposal not found)](contracts/TgtDao.sol#L253)
	- [block.timestamp < proposal.startTime](contracts/TgtDao.sol#L261)
	- [block.timestamp <= proposal.endTime](contracts/TgtDao.sol#L264)

contracts/TgtDao.sol#L251-L275


 - [ ] ID-14
[TGTStaking.hasMaturedStake(address)](contracts/TGTStaking.sol#L239-L242) uses timestamp for comparisons
	Dangerous comparisons:
	- [pendingVotingPower(account) > 0 && startedAt != 0 && block.timestamp >= startedAt + VOTING_POWER_DELAY](contracts/TGTStaking.sol#L241)

contracts/TGTStaking.sol#L239-L242


## reentrancy-no-eth
Impact: Medium
Confidence: Medium
 - [ ] ID-15
Reentrancy in [EscrowVault.releasePayment(uint256)](contracts/EscrowVault.sol#L336-L359):
	External calls:
	- [_settleYield(_guaranteeTokenId,service.yieldRightTokenId,service,yieldOwner,false)](contracts/EscrowVault.sol#L347)
		- [require(bool,string)(aavePool.withdraw(service.paymentToken,claimableYieldGross,address(this)) >= claimableYieldGross,Insufficient yield withdrawn)](contracts/EscrowVault.sol#L441-L444)
		- [stakingRewardsContract.notifyRewardAmount(stakingRewardsAmount)](contracts/EscrowVault.sol#L460)
	State variables written after the call(s):
	- [service.principalReleased = true](contracts/EscrowVault.sol#L349)
	[EscrowVault.services](contracts/EscrowVault.sol#L107) can be used in cross function reentrancies:
	- [EscrowVault.getClaimableYield(uint256)](contracts/EscrowVault.sol#L378-L397)
	- [EscrowVault.getClaimableYieldGross(uint256)](contracts/EscrowVault.sol#L247-L259)
	- [EscrowVault.services](contracts/EscrowVault.sol#L107)

contracts/EscrowVault.sol#L336-L359


## reentrancy-benign
Impact: Low
Confidence: Medium
 - [ ] ID-16
INFO:Slither:contracts analyzed (100 contracts with 101 detectors), 38 result(s) found
Reentrancy in [EscrowVault.deposit(address,address,uint256,uint256)](contracts/EscrowVault.sol#L273-L332):
	External calls:
	- [aavePool.supply(address(usdcToken),_amount,address(this),0)](contracts/EscrowVault.sol#L298)
	- [guaranteeTokenId = nftContract.mintGuarantee(_employee)](contracts/EscrowVault.sol#L300)
	- [yieldRightTokenId = yieldRightNftContract.mintYieldRight(msg.sender)](contracts/EscrowVault.sol#L301)
	State variables written after the call(s):
	- [services[guaranteeTokenId] = Service({employer:msg.sender,employee:_employee,paymentToken:address(usdcToken),amountLocked:_amount,startTime:block.timestamp,lockDuration:lockDuration,yieldRightTokenId:yieldRightTokenId,startIncomeIndex:startIncomeIndex,claimedYield:0,principalReleased:false})](contracts/EscrowVault.sol#L307-L318)
	- [yieldRightToGuaranteeToken[yieldRightTokenId] = guaranteeTokenId](contracts/EscrowVault.sol#L320)

contracts/EscrowVault.sol#L273-L332


## naming-convention
Impact: Informational
Confidence: High
 - [ ] ID-17
Parameter [EscrowVault.setPlatformFeeRecipient(address)._newRecipient](contracts/EscrowVault.sol#L203) is not in mixedCase

contracts/EscrowVault.sol#L203


 - [ ] ID-18
Parameter [EscrowVault.deposit(address,address,uint256,uint256)._employee](contracts/EscrowVault.sol#L274) is not in mixedCase

contracts/EscrowVault.sol#L274


 - [ ] ID-19
Parameter [EscrowVault.deposit(address,address,uint256,uint256)._amount](contracts/EscrowVault.sol#L276) is not in mixedCase

contracts/EscrowVault.sol#L276


 - [ ] ID-20
Parameter [EscrowVault.getDepositUsdValue(address,uint256)._paymentToken](contracts/EscrowVault.sol#L263) is not in mixedCase

contracts/EscrowVault.sol#L263


 - [ ] ID-21
Parameter [EscrowVault.setStakingRewardsContract(address)._newContract](contracts/EscrowVault.sol#L214) is not in mixedCase

contracts/EscrowVault.sol#L214


 - [ ] ID-22
Parameter [EscrowVault.claimYield(uint256)._yieldRightTokenId](contracts/EscrowVault.sol#L363) is not in mixedCase

contracts/EscrowVault.sol#L363


 - [ ] ID-23
Parameter [EscrowVault.getClaimableYield(uint256)._yieldRightTokenId](contracts/EscrowVault.sol#L378) is not in mixedCase

contracts/EscrowVault.sol#L378


 - [ ] ID-24
Parameter [EscrowVault.releasePayment(uint256)._guaranteeTokenId](contracts/EscrowVault.sol#L336) is not in mixedCase

contracts/EscrowVault.sol#L336


 - [ ] ID-25
Parameter [EscrowVault.getClaimableYieldGross(uint256)._yieldRightTokenId](contracts/EscrowVault.sol#L247) is not in mixedCase

contracts/EscrowVault.sol#L247


 - [ ] ID-26
Parameter [EscrowVault.setGovernanceToken(address)._governanceTokenAddress](contracts/EscrowVault.sol#L192) is not in mixedCase

contracts/EscrowVault.sol#L192


 - [ ] ID-27
Parameter [EscrowVault.deposit(address,address,uint256,uint256)._durationUnits](contracts/EscrowVault.sol#L277) is not in mixedCase

contracts/EscrowVault.sol#L277


 - [ ] ID-28
Parameter [EscrowVault.getDepositUsdValue(address,uint256)._amount](contracts/EscrowVault.sol#L263) is not in mixedCase

contracts/EscrowVault.sol#L263


 - [ ] ID-29
Parameter [EscrowVault.deposit(address,address,uint256,uint256)._paymentToken](contracts/EscrowVault.sol#L275) is not in mixedCase

contracts/EscrowVault.sol#L275


 - [ ] ID-30
Parameter [GuaranteeNFT.setEscrowVault(address)._escrow](contracts/GuaranteeNFT.sol#L25) is not in mixedCase

contracts/GuaranteeNFT.sol#L25


 - [ ] ID-31
Variable [TGTStaking.VOTING_POWER_DELAY](contracts/TGTStaking.sol#L14) is not in mixedCase

contracts/TGTStaking.sol#L14


 - [ ] ID-32
Parameter [YieldRightNFT.setEscrowVault(address)._escrow](contracts/YieldRightNFT.sol#L22) is not in mixedCase

contracts/YieldRightNFT.sol#L22


## immutable-states
Impact: Optimization
Confidence: High
 - [ ] ID-33
[EscrowVault.priceOracle](contracts/EscrowVault.sol#L114) should be immutable 

contracts/EscrowVault.sol#L114


 - [ ] ID-34
[EscrowVault.yieldRightNftContract](contracts/EscrowVault.sol#L111) should be immutable 

contracts/EscrowVault.sol#L111


 - [ ] ID-35
[EscrowVault.aavePool](contracts/EscrowVault.sol#L113) should be immutable 

contracts/EscrowVault.sol#L113


 - [ ] ID-36
[EscrowVault.nftContract](contracts/EscrowVault.sol#L110) should be immutable 

contracts/EscrowVault.sol#L110


## low-level-calls
Impact: Informational
Confidence: High
 - [ ] ID-37
Low level call in [TgtDao.execute(uint256)](contracts/TgtDao.sol#L210-L222):
	- [(success,returndata) = proposal.target.call{value: proposal.value}(proposal.data)](contracts/TgtDao.sol#L217)

contracts/TgtDao.sol#L210-L222


