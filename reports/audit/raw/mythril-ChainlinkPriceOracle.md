/home/mhbs/.venvs/tesserate-mythril/lib/python3.10/site-packages/eth/__init__.py:1: UserWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html. The pkg_resources package is slated for removal as early as 2025-11-30. Refrain from using this package or pin to Setuptools<81.
  import pkg_resources
# Analysis results for None

## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0x932b80193477530A109108413f1b928a2C39D413
- Function name: `_function_0x9dcb511a`
- PC address: 368
- Estimated Gas Usage: 1256 - 1729

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [ATTACKER], function: unknown, txdata: 0x9dcb511a0000000000000000000000000000000000000000000000000000000000000000, decoded_data: , value: 0x0


## Integer Arithmetic Bugs
- SWC ID: 101
- Severity: High
- Contract: 0x932b80193477530A109108413f1b928a2C39D413
- Function name: `owner() or ideal_warn_timed(uint256,uint128)`
- PC address: 431
- Estimated Gas Usage: 1089 - 1372

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
- Contract: 0x932b80193477530A109108413f1b928a2C39D413
- Function name: `_function_0x1584410a`
- PC address: 1029
- Estimated Gas Usage: 948 - 1138

### Description

The arithmetic operator can overflow.
It is possible to cause an integer overflow or underflow in the arithmetic operation.

### Initial State:

Account: [ATTACKER], balance: 0x0, nonce:0, storage:{}
Account: [SOMEGUY], balance: 0x0, nonce:0, storage:{}

### Transaction Sequence

Caller: [CREATOR], calldata: 0x1584410a, decoded_data: , value: 0x0


