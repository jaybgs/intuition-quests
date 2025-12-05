// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title QuestClaimSurcharge
 * @notice Contract that collects 1 TRUST surcharge when users claim quest rewards
 * @dev Splits the surcharge: 60% to staking relayer, 40% to revenue wallet
 * 
 * Flow:
 * 1. User approves this contract to spend TRUST tokens
 * 2. User calls claim(questId)
 * 3. Contract pulls 1 TRUST from user
 * 4. Contract splits: 0.6 TRUST → stakingRelayer, 0.4 TRUST → revenueWallet
 * 5. Contract marks quest as claimed for that user
 */
contract QuestClaimSurcharge is Ownable, ReentrancyGuard {
    IERC20 public immutable trustToken;
    address public revenueWallet;
    address public stakingRelayer;
    
    uint256 public constant SURCHARGE_AMOUNT = 1e18; // 1 TRUST (assuming 18 decimals)
    uint256 public constant STAKEHOLDER_SHARE = 6e17; // 0.6 TRUST (60%)
    uint256 public constant REVENUE_SHARE = 4e17; // 0.4 TRUST (40%)
    
    // Mapping: questId => user => hasClaimed
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    
    event RevenueSent(
        uint256 indexed questId,
        address indexed user,
        uint256 amount
    );
    
    event ForwardedToRelayer(
        uint256 indexed questId,
        address indexed user,
        uint256 amount
    );
    
    event Claimed(
        uint256 indexed questId,
        address indexed user
    );
    
    error AlreadyClaimed(uint256 questId, address user);
    error InsufficientBalance(address user, uint256 required, uint256 available);
    error InsufficientAllowance(address user, uint256 required, uint256 allowed);
    error TransferFailed();
    error InvalidAddress();
    
    /**
     * @notice Constructor
     * @param _trustToken Address of the TRUST ERC20 token
     * @param _revenueWallet Address to receive 40% of surcharge (0.4 TRUST)
     * @param _stakingRelayer Address to receive 60% of surcharge (0.6 TRUST)
     */
    constructor(
        address _trustToken,
        address _revenueWallet,
        address _stakingRelayer
    ) Ownable(msg.sender) {
        require(_trustToken != address(0), "Invalid trust token address");
        require(_revenueWallet != address(0), "Invalid revenue wallet address");
        require(_stakingRelayer != address(0), "Invalid staking relayer address");
        
        trustToken = IERC20(_trustToken);
        revenueWallet = _revenueWallet;
        stakingRelayer = _stakingRelayer;
    }
    
    /**
     * @notice Claim a quest by paying the surcharge
     * @param questId The quest ID (uint256)
     * @dev User must have approved this contract to spend at least 1 TRUST
     * @dev Prevents double claiming via hasClaimed mapping
     */
    function claim(uint256 questId) external nonReentrant {
        // Check if already claimed
        if (hasClaimed[questId][msg.sender]) {
            revert AlreadyClaimed(questId, msg.sender);
        }
        
        // Check user's balance
        uint256 balance = trustToken.balanceOf(msg.sender);
        if (balance < SURCHARGE_AMOUNT) {
            revert InsufficientBalance(msg.sender, SURCHARGE_AMOUNT, balance);
        }
        
        // Check allowance
        uint256 allowance = trustToken.allowance(msg.sender, address(this));
        if (allowance < SURCHARGE_AMOUNT) {
            revert InsufficientAllowance(msg.sender, SURCHARGE_AMOUNT, allowance);
        }
        
        // Transfer 1 TRUST from user to this contract
        bool success = trustToken.transferFrom(msg.sender, address(this), SURCHARGE_AMOUNT);
        if (!success) {
            revert TransferFailed();
        }
        
        // Transfer 0.4 TRUST to revenue wallet
        success = trustToken.transfer(revenueWallet, REVENUE_SHARE);
        if (!success) {
            revert TransferFailed();
        }
        emit RevenueSent(questId, msg.sender, REVENUE_SHARE);
        
        // Transfer 0.6 TRUST to staking relayer
        success = trustToken.transfer(stakingRelayer, STAKEHOLDER_SHARE);
        if (!success) {
            revert TransferFailed();
        }
        emit ForwardedToRelayer(questId, msg.sender, STAKEHOLDER_SHARE);
        
        // Mark as claimed
        hasClaimed[questId][msg.sender] = true;
        emit Claimed(questId, msg.sender);
    }
    
    /**
     * @notice Update revenue wallet address (only owner)
     * @param _newRevenueWallet New revenue wallet address
     */
    function setRevenueWallet(address _newRevenueWallet) external onlyOwner {
        if (_newRevenueWallet == address(0)) {
            revert InvalidAddress();
        }
        revenueWallet = _newRevenueWallet;
    }
    
    /**
     * @notice Update staking relayer address (only owner)
     * @param _newStakingRelayer New staking relayer address
     */
    function setStakingRelayer(address _newStakingRelayer) external onlyOwner {
        if (_newStakingRelayer == address(0)) {
            revert InvalidAddress();
        }
        stakingRelayer = _newStakingRelayer;
    }
    
    /**
     * @notice Emergency function to withdraw stuck TRUST tokens (only owner)
     * @dev Should not be needed in normal operation, but included for safety
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = trustToken.balanceOf(address(this));
        if (balance > 0) {
            bool success = trustToken.transfer(owner(), balance);
            require(success, "Emergency withdrawal failed");
        }
    }
}
