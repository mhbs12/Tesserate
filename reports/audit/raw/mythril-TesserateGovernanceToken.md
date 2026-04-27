/home/mhbs/.venvs/tesserate-mythril/lib/python3.10/site-packages/eth/__init__.py:1: UserWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html. The pkg_resources package is slated for removal as early as 2025-11-30. Refrain from using this package or pin to Setuptools<81.
  import pkg_resources
# Analysis results for None

## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0xf5535cA66aedd684E782D216B2182dE480c1e0BD
- Function name: `allowance(address,address)`
- PC address: 321
- Estimated Gas Usage: 1515 - 2178

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [ATTACKER], function: allowance(address,address), txdata: 0xdd62ed3e00000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000, decoded_data: ('0x0000000000000000000000000100000000000000', '0x0000000000000000000000000000000000000000'), value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0xf5535cA66aedd684E782D216B2182dE480c1e0BD
- Function name: `transfer(address,uint256) or many_msg_babbage(bytes1)`
- PC address: 401
- Estimated Gas Usage: 13918 - 55215

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [ATTACKER], function: many_msg_babbage(bytes1), txdata: 0xa9059cbb00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000, value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0xf5535cA66aedd684E782D216B2182dE480c1e0BD
- Function name: `owner() or ideal_warn_timed(uint256,uint128)`
- PC address: 732
- Estimated Gas Usage: 1156 - 1439

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
- Contract: 0xf5535cA66aedd684E782D216B2182dE480c1e0BD
- Function name: `balanceOf(address)`
- PC address: 864
- Estimated Gas Usage: 1237 - 1710

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [ATTACKER], function: balanceOf(address), txdata: 0x70a082310000000000000000000000000000000000000000000000000000000000000000, decoded_data: ('0x0000000000000000000000000000000000000000',), value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0xf5535cA66aedd684E782D216B2182dE480c1e0BD
- Function name: `MAX_SUPPLY()`
- PC address: 918
- Estimated Gas Usage: 263 - 546

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [CREATOR], calldata: 0x32cb6b0c, value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0xf5535cA66aedd684E782D216B2182dE480c1e0BD
- Function name: `decimals() or available_assert_time(uint16,uint64)`
- PC address: 954
- Estimated Gas Usage: 241 - 524

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [CREATOR], calldata: 0x313ce567, value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0xf5535cA66aedd684E782D216B2182dE480c1e0BD
- Function name: `gasprice_bit_ether(int128) or transferFrom(address,address,uint256)`
- PC address: 982
- Estimated Gas Usage: 20067 - 82124

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [SOMEGUY], function: gasprice_bit_ether(int128), txdata: 0x23b872dd000000000000000000000000000001000000200100010001000000010000000100000000000000000000000000000100000020010001000100000001000000010000000000000000000000000000000000000000000000000000000000000000, value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0xf5535cA66aedd684E782D216B2182dE480c1e0BD
- Function name: `totalSupply()`
- PC address: 1204
- Estimated Gas Usage: 1000 - 1283

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [CREATOR], calldata: 0x18160ddd, value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0xf5535cA66aedd684E782D216B2182dE480c1e0BD
- Function name: `approve(address,uint256)`
- PC address: 1234
- Estimated Gas Usage: 6969 - 28076

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [ATTACKER], function: approve(address,uint256), txdata: 0x095ea7b300000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000, decoded_data: ('0x0000000000000000000000000000000000000001', 0), value: 0x0


