// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TrustQuestsPayment is ReentrancyGuard {

    // Authorized withdrawal address
    address public constant AUTHORIZED_WITHDRAWER = 0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07;

    // Pro plan price: 10 TRUST (with 18 decimals)
    uint256 public constant PRO_PLAN_PRICE = 10 * 10**18;

    // User pro status
    mapping(address => bool) public hasPaidPro;
    mapping(address => uint256) public paymentTimestamps;

    // Emergency controls
    bool public paused;

    // Events
    event ProPaymentReceived(address indexed user, uint256 amount, uint256 timestamp);
    event FundsWithdrawn(address indexed to, uint256 amount, address indexed by);
    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);

    modifier notPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier onlyAuthorizedWithdrawer() {
        require(msg.sender == AUTHORIZED_WITHDRAWER, "Not authorized to withdraw");
        _;
    }

    /**
     * @dev Constructor
     * TRUST is the native token on Intuition chain, no token contract needed
     */
    constructor() {}

    /**
     * @dev Pay for Pro plan with native TRUST tokens
     * User sends TRUST directly to the contract
     */
    function payForPro() external payable notPaused nonReentrant {
        require(!hasPaidPro[msg.sender], "Already a pro user");
        require(msg.value == PRO_PLAN_PRICE, "Incorrect payment amount");

        // Update user status
        hasPaidPro[msg.sender] = true;
        paymentTimestamps[msg.sender] = block.timestamp;

        emit ProPaymentReceived(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Check if user has pro status
     * @param user Address to check
     */
    function isProUser(address user) external view returns (bool) {
        return hasPaidPro[user];
    }

    /**
     * @dev Get contract native TRUST balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ========================================
    // WITHDRAWAL FUNCTIONS (AUTHORIZED ONLY)
    // ========================================

    /**
     * @dev Emergency pause all payments
     */
    function pause() external onlyAuthorizedWithdrawer {
        paused = true;
        emit EmergencyPaused(msg.sender);
    }

    /**
     * @dev Emergency unpause payments
     */
    function unpause() external onlyAuthorizedWithdrawer {
        paused = false;
        emit EmergencyUnpaused(msg.sender);
    }

    /**
     * @dev Withdraw specific amount of native TRUST tokens
     * @param to Recipient address
     * @param amount Amount to withdraw (in wei)
     */
    function withdrawFunds(address payable to, uint256 amount) external onlyAuthorizedWithdrawer {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");
        require(amount <= address(this).balance, "Insufficient balance");

        (bool success,) = to.call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(to, amount, msg.sender);
    }

    /**
     * @dev Withdraw all accumulated native TRUST tokens to authorized withdrawer
     * @param to Recipient address
     */
    function withdrawAllFunds(address payable to) external onlyAuthorizedWithdrawer {
        require(to != address(0), "Invalid recipient");

        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success,) = to.call{value: balance}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(to, balance, msg.sender);
    }

    // ========================================
    // TESTING/ADMIN FUNCTIONS (AUTHORIZED ONLY)
    // ========================================

    /**
     * @dev Reset pro status for a user (testing purposes only)
     * @param user Address to reset pro status for
     */
    function resetProStatus(address user) external onlyAuthorizedWithdrawer {
        require(user != address(0), "Invalid user address");

        hasPaidPro[user] = false;
        paymentTimestamps[user] = 0;

        emit FundsWithdrawn(user, 0, msg.sender); // Reuse event for logging
    }

    /**
     * @dev Reset pro status for multiple users (batch testing)
     * @param users Array of addresses to reset
     */
    function resetProStatusBatch(address[] calldata users) external onlyAuthorizedWithdrawer {
        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid user address");
            hasPaidPro[users[i]] = false;
            paymentTimestamps[users[i]] = 0;
        }

        emit FundsWithdrawn(msg.sender, 0, msg.sender); // Reuse event for logging
    }
}
