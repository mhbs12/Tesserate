// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockGovernanceTarget {
    uint256 public storedValue;

    event StoredValueUpdated(uint256 newValue);

    function setStoredValue(uint256 newValue) external {
        storedValue = newValue;
        emit StoredValueUpdated(newValue);
    }
}
