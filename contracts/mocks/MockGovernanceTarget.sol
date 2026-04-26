// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockGovernanceTarget {
    uint256 public storedValue;

    event StoredValueUpdated(uint256 newValue);

    /// @notice Altera storedValue.
    /// @dev Usado pelos testes da TgtDao como alvo de uma proposta executada.
    function setStoredValue(uint256 newValue) external {
        storedValue = newValue;
        emit StoredValueUpdated(newValue);
    }
}
