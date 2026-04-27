/home/mhbs/.venvs/tesserate-mythril/lib/python3.10/site-packages/eth/__init__.py:1: UserWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html. The pkg_resources package is slated for removal as early as 2025-11-30. Refrain from using this package or pin to Setuptools<81.
  import pkg_resources
# Analysis results for None

## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0xB0768Dca22fb3C1B4DAdAc21902C019459E4A99F
- Function name: `isApprovedForAll(address,address)`
- PC address: 413
- Estimated Gas Usage: 1700 - 2363

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [SOMEGUY], function: isApprovedForAll(address,address), txdata: 0xe985e9c500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000040000000000000000000000, decoded_data: ('0x0000000000000000000000000000000000000001', '0x0000000000000000040000000000000000000000'), value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0xB0768Dca22fb3C1B4DAdAc21902C019459E4A99F
- Function name: `_function_0xcd392a83`
- PC address: 501
- Estimated Gas Usage: 1438 - 1911

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [CREATOR], calldata: 0xcd392a830000000000000000000000000000000000000000000000000000000000000000, decoded_data: , value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0xB0768Dca22fb3C1B4DAdAc21902C019459E4A99F
- Function name: `setApprovalForAll(address,bool)`
- PC address: 1041
- Estimated Gas Usage: 8097 - 29016

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [SOMEGUY], function: setApprovalForAll(address,bool), txdata: 0xa22cb46500000000000000000000000001010101010101010101010101010101010101010000000000000000000000000000000000000000000000000000000000000000, decoded_data: ('0x0101010101010101010101010101010101010101', False), value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0xB0768Dca22fb3C1B4DAdAc21902C019459E4A99F
- Function name: `ideal_warn_timed(uint256,uint128) or owner()`
- PC address: 1484
- Estimated Gas Usage: 1249 - 1532

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
- Contract: 0xB0768Dca22fb3C1B4DAdAc21902C019459E4A99F
- Function name: `_function_0x8a2ae60b`
- PC address: 1524
- Estimated Gas Usage: 1227 - 1510

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
- Contract: 0xB0768Dca22fb3C1B4DAdAc21902C019459E4A99F
- Function name: `balanceOf(address)`
- PC address: 1656
- Estimated Gas Usage: 1328 - 1801

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
- Contract: 0xB0768Dca22fb3C1B4DAdAc21902C019459E4A99F
- Function name: `supportsInterface(bytes4) or pizza_mandate_apology(uint256)`
- PC address: 3274
- Estimated Gas Usage: 327 - 517

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [CREATOR], calldata: 0x01ffc9a70000000000000000000000000000000000000000000000000000000000000000, decoded_data: (0,), value: 0x0


