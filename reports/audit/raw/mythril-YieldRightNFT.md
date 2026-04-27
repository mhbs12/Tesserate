/home/mhbs/.venvs/tesserate-mythril/lib/python3.10/site-packages/eth/__init__.py:1: UserWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html. The pkg_resources package is slated for removal as early as 2025-11-30. Refrain from using this package or pin to Setuptools<81.
  import pkg_resources
# Analysis results for None

## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0x5a172C4438E91AFa5cff5cC80d749f753eeA57e9
- Function name: `isApprovedForAll(address,address)`
- PC address: 391
- Estimated Gas Usage: 1656 - 2319

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [CREATOR], calldata: 0xe985e9c500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000, decoded_data: ('0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000000'), value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0x5a172C4438E91AFa5cff5cC80d749f753eeA57e9
- Function name: `setApprovalForAll(address,bool)`
- PC address: 972
- Estimated Gas Usage: 8075 - 28994

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [ATTACKER], function: setApprovalForAll(address,bool), txdata: 0xa22cb46500000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000, decoded_data: ('0x0000000000000000000000000000000000000002', False), value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0x5a172C4438E91AFa5cff5cC80d749f753eeA57e9
- Function name: `ideal_warn_timed(uint256,uint128) or owner()`
- PC address: 2166
- Estimated Gas Usage: 1205 - 1488

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [CREATOR], calldata: 0x8da5cb5b, value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0x5a172C4438E91AFa5cff5cC80d749f753eeA57e9
- Function name: `_function_0x8a2ae60b`
- PC address: 2206
- Estimated Gas Usage: 1183 - 1466

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [CREATOR], calldata: 0x8a2ae60b, decoded_data: , value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0x5a172C4438E91AFa5cff5cC80d749f753eeA57e9
- Function name: `balanceOf(address)`
- PC address: 2338
- Estimated Gas Usage: 1284 - 1757

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [SOMEGUY], function: balanceOf(address), txdata: 0x70a082310000000000000000000000000000000000000000000000000000000000000001, decoded_data: ('0x0000000000000000000000000000000000000001',), value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0x5a172C4438E91AFa5cff5cC80d749f753eeA57e9
- Function name: `supportsInterface(bytes4) or pizza_mandate_apology(uint256)`
- PC address: 3015
- Estimated Gas Usage: 327 - 517

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [CREATOR], calldata: 0x01ffc9a70000000000000000000000000000000000000000000000000000000000000000, decoded_data: (0,), value: 0x0


