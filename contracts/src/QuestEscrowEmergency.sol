// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title QuestEscrowEmergency
 * @dev Emergency contract to rescue funds from the QuestEscrow contract
 * This contract allows the owner to withdraw all funds after ownership transfer
 */
contract QuestEscrowEmergency is Ownable, ReentrancyGuard {

    // Events
    event EmergencyWithdrawal(address indexed to, uint256 amount, address indexed by);

    /**
     * @dev Emergency withdrawal function - only owner can call
     * @param to Address to send funds to
     */
    function emergencyWithdraw(address payable to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid address");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        // Transfer all funds to the specified address
        (bool success, ) = to.call{value: balance}("");
        require(success, "Transfer failed");

        emit EmergencyWithdrawal(to, balance, msg.sender);
    }

    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Receive function to accept ETH/TRUST
     */
    receive() external payable {}

    /**
     * @dev Fallback function
     */
    fallback() external payable {}
}
