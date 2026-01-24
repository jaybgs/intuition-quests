// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title QuestEscrow
 * @author TrustQuests
 * @notice Escrow contract for quest reward deposits on Intuition Network
 * @dev Handles TRUST token deposits for quest rewards and distribution to winners
 * 
 * Flow:
 * 1. Quest creator deposits TRUST when creating quest with token rewards
 * 2. Users complete quest (tracked off-chain in database)
 * 3. After quest expires, creator/admin distributes rewards to winners
 * 4. If no completions after 3 days grace period, creator can refund
 * 
 * Chain: Intuition Mainnet (Chain ID: 1155)
 * Native Token: TRUST (18 decimals)
 */
contract QuestEscrow is Ownable, ReentrancyGuard, Pausable {
    
    // ============================================
    // CONSTANTS
    // ============================================
    
    /// @notice Grace period before refund is allowed (3 days)
    uint256 public constant GRACE_PERIOD = 3 days;
    
    /// @notice Minimum deposit amount (0.1 TRUST)
    uint256 public constant MIN_DEPOSIT = 0.1 ether;
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    /// @notice Admin wallet that can trigger distributions
    address public adminWallet;
    
    /// @notice Quest deposit information
    struct QuestDeposit {
        address creator;           // Quest creator who deposited
        uint256 amount;            // Total deposited amount
        uint256 distributed;       // Amount already distributed
        uint256 depositedAt;       // Timestamp of deposit
        uint256 expiresAt;         // Quest expiration timestamp
        bool isActive;             // Whether deposit is active
        uint256 completionCount;   // Number of completions (updated by admin/backend)
    }
    
    /// @notice Mapping from questId to deposit info
    mapping(bytes32 => QuestDeposit) public questDeposits;
    
    /// @notice Mapping to track distributed amounts per winner per quest
    mapping(bytes32 => mapping(address => uint256)) public winnerPayouts;
    
    /// @notice Total TRUST held in escrow
    uint256 public totalEscrowBalance;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event RewardDeposited(
        bytes32 indexed questId,
        address indexed creator,
        uint256 amount,
        uint256 expiresAt
    );
    
    event RewardsDistributed(
        bytes32 indexed questId,
        address[] winners,
        uint256[] amounts,
        uint256 totalDistributed
    );
    
    event SingleRewardDistributed(
        bytes32 indexed questId,
        address indexed winner,
        uint256 amount
    );
    
    event DepositRefunded(
        bytes32 indexed questId,
        address indexed creator,
        uint256 amount
    );
    
    event CompletionCountUpdated(
        bytes32 indexed questId,
        uint256 newCount
    );
    
    event AdminWalletUpdated(
        address indexed oldAdmin,
        address indexed newAdmin
    );
    
    event EmergencyWithdrawal(
        address indexed to,
        uint256 amount,
        address indexed by
    );
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier onlyCreatorOrAdmin(bytes32 questId) {
        QuestDeposit storage deposit = questDeposits[questId];
        require(
            msg.sender == deposit.creator || 
            msg.sender == adminWallet || 
            msg.sender == owner(),
            "Not authorized"
        );
        _;
    }
    
    modifier onlyAdminOrOwner() {
        require(
            msg.sender == adminWallet || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }
    
    modifier validQuestId(bytes32 questId) {
        require(questId != bytes32(0), "Invalid quest ID");
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    /**
     * @notice Initialize the escrow contract
     * @param _adminWallet Address of the admin wallet for distributions
     */
    constructor(address _adminWallet) {
        require(_adminWallet != address(0), "Invalid admin address");
        adminWallet = _adminWallet;
    }
    
    // ============================================
    // DEPOSIT FUNCTIONS
    // ============================================
    
    /**
     * @notice Deposit TRUST tokens for a quest reward
     * @param questId Unique identifier for the quest (bytes32 hash)
     * @param expiresAt Timestamp when the quest expires
     * @dev Creator sends TRUST with this call, amount is msg.value
     */
    function depositReward(
        bytes32 questId,
        uint256 expiresAt
    ) external payable nonReentrant whenNotPaused validQuestId(questId) {
        require(msg.value >= MIN_DEPOSIT, "Amount too small");
        require(expiresAt > block.timestamp, "Invalid expiry");
        require(!questDeposits[questId].isActive, "Quest already has deposit");
        
        questDeposits[questId] = QuestDeposit({
            creator: msg.sender,
            amount: msg.value,
            distributed: 0,
            depositedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true,
            completionCount: 0
        });
        
        totalEscrowBalance += msg.value;
        
        emit RewardDeposited(questId, msg.sender, msg.value, expiresAt);
    }
    
    /**
     * @notice Add more TRUST to an existing quest deposit
     * @param questId Quest to add deposit to
     */
    function addToDeposit(bytes32 questId) external payable nonReentrant whenNotPaused {
        QuestDeposit storage deposit = questDeposits[questId];
        require(deposit.isActive, "Quest not found");
        require(msg.sender == deposit.creator, "Not creator");
        require(msg.value > 0, "Invalid amount");
        
        deposit.amount += msg.value;
        totalEscrowBalance += msg.value;
        
        emit RewardDeposited(questId, msg.sender, msg.value, deposit.expiresAt);
    }
    
    // ============================================
    // DISTRIBUTION FUNCTIONS
    // ============================================
    
    /**
     * @notice Distribute rewards to multiple winners
     * @param questId Quest to distribute rewards for
     * @param winners Array of winner addresses
     * @param amounts Array of amounts to send to each winner
     * @dev Can only be called by quest creator, admin, or owner
     */
    function distributeRewards(
        bytes32 questId,
        address[] calldata winners,
        uint256[] calldata amounts
    ) external nonReentrant whenNotPaused onlyCreatorOrAdmin(questId) {
        require(winners.length > 0, "No winners");
        require(winners.length == amounts.length, "Array mismatch");
        
        QuestDeposit storage deposit = questDeposits[questId];
        require(deposit.isActive, "Quest not found");
        
        uint256 totalToDistribute = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalToDistribute += amounts[i];
        }
        
        uint256 remaining = deposit.amount - deposit.distributed;
        require(totalToDistribute <= remaining, "Insufficient deposit");
        
        // Distribute to each winner
        for (uint256 i = 0; i < winners.length; i++) {
            require(winners[i] != address(0), "Invalid winner");
            if (amounts[i] == 0) continue;
            
            (bool success, ) = winners[i].call{value: amounts[i]}("");
            require(success, "Transfer failed");
            
            winnerPayouts[questId][winners[i]] += amounts[i];
            
            emit SingleRewardDistributed(questId, winners[i], amounts[i]);
        }
        
        deposit.distributed += totalToDistribute;
        totalEscrowBalance -= totalToDistribute;
        
        // If fully distributed, mark as inactive
        if (deposit.distributed >= deposit.amount) {
            deposit.isActive = false;
        }
        
        emit RewardsDistributed(questId, winners, amounts, totalToDistribute);
    }
    
    /**
     * @notice Distribute reward to a single winner
     * @param questId Quest to distribute reward for
     * @param winner Winner address
     * @param amount Amount to send
     */
    function distributeSingleReward(
        bytes32 questId,
        address winner,
        uint256 amount
    ) external nonReentrant whenNotPaused onlyCreatorOrAdmin(questId) {
        require(winner != address(0), "Invalid winner");
        require(amount > 0, "Invalid amount");
        
        QuestDeposit storage deposit = questDeposits[questId];
        require(deposit.isActive, "Quest not found");
        
        uint256 remaining = deposit.amount - deposit.distributed;
        require(amount <= remaining, "Insufficient deposit");
        
        (bool success, ) = winner.call{value: amount}("");
        require(success, "Transfer failed");
        
        deposit.distributed += amount;
        totalEscrowBalance -= amount;
        winnerPayouts[questId][winner] += amount;
        
        // If fully distributed, mark as inactive
        if (deposit.distributed >= deposit.amount) {
            deposit.isActive = false;
        }
        
        emit SingleRewardDistributed(questId, winner, amount);
    }
    
    // ============================================
    // REFUND FUNCTIONS
    // ============================================
    
    /**
     * @notice Refund remaining deposit to quest creator
     * @param questId Quest to refund
     * @dev Only allowed after grace period if no completions, or by admin/owner anytime
     */
    function refundDeposit(bytes32 questId) external nonReentrant {
        QuestDeposit storage deposit = questDeposits[questId];
        require(deposit.isActive, "Quest not found");
        
        bool isAdmin = msg.sender == adminWallet || msg.sender == owner();
        bool isCreator = msg.sender == deposit.creator;
        
        require(isAdmin || isCreator, "Not authorized");
        
        // Creators can only refund after grace period with no completions
        if (isCreator && !isAdmin) {
            // Must be expired + grace period passed
            require(
                block.timestamp >= deposit.expiresAt + GRACE_PERIOD,
                "Grace period not passed"
            );
            // Must have no completions
            require(deposit.completionCount == 0, "Quest has completions");
        }
        
        uint256 remaining = deposit.amount - deposit.distributed;
        require(remaining > 0, "No funds to refund");
        
        deposit.distributed = deposit.amount; // Mark as fully handled
        deposit.isActive = false;
        totalEscrowBalance -= remaining;
        
        (bool success, ) = deposit.creator.call{value: remaining}("");
        require(success, "Transfer failed");
        
        emit DepositRefunded(questId, deposit.creator, remaining);
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Update completion count for a quest (called by backend)
     * @param questId Quest to update
     * @param count New completion count
     */
    function updateCompletionCount(
        bytes32 questId, 
        uint256 count
    ) external onlyAdminOrOwner {
        QuestDeposit storage deposit = questDeposits[questId];
        require(deposit.isActive, "Quest not found");
        
        deposit.completionCount = count;
        
        emit CompletionCountUpdated(questId, count);
    }
    
    /**
     * @notice Update admin wallet address
     * @param newAdmin New admin wallet address
     */
    function setAdminWallet(address newAdmin) external onlyOwner {
        require(newAdmin != address(0), "Invalid address");
        
        address oldAdmin = adminWallet;
        adminWallet = newAdmin;
        
        emit AdminWalletUpdated(oldAdmin, newAdmin);
    }
    
    /**
     * @notice Emergency withdrawal of all funds (owner only)
     * @param to Address to send funds to
     * @dev Use only in emergencies - will affect all active quests
     */
    function emergencyWithdraw(address payable to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid address");
        
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        
        totalEscrowBalance = 0;
        
        (bool success, ) = to.call{value: balance}("");
        require(success, "Transfer failed");
        
        emit EmergencyWithdrawal(to, balance, msg.sender);
    }
    
    /**
     * @notice Withdraw specific amount (owner only)
     * @param to Address to send funds to
     * @param amount Amount to withdraw
     */
    function adminWithdraw(
        address payable to, 
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Invalid amount");
        require(amount <= address(this).balance, "Insufficient balance");
        
        totalEscrowBalance = totalEscrowBalance > amount ? totalEscrowBalance - amount : 0;
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit EmergencyWithdrawal(to, amount, msg.sender);
    }
    
    /**
     * @notice Pause contract (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause contract (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @notice Get deposit details for a quest
     * @param questId Quest to query
     */
    function getQuestDeposit(bytes32 questId) external view returns (
        address creator,
        uint256 amount,
        uint256 distributed,
        uint256 remaining,
        uint256 depositedAt,
        uint256 expiresAt,
        bool isActive,
        uint256 completionCount
    ) {
        QuestDeposit storage deposit = questDeposits[questId];
        return (
            deposit.creator,
            deposit.amount,
            deposit.distributed,
            deposit.amount - deposit.distributed,
            deposit.depositedAt,
            deposit.expiresAt,
            deposit.isActive,
            deposit.completionCount
        );
    }
    
    /**
     * @notice Check if a quest has an active deposit
     * @param questId Quest to check
     */
    function hasActiveDeposit(bytes32 questId) external view returns (bool) {
        return questDeposits[questId].isActive;
    }
    
    /**
     * @notice Get remaining balance for a quest
     * @param questId Quest to query
     */
    function getRemainingBalance(bytes32 questId) external view returns (uint256) {
        QuestDeposit storage deposit = questDeposits[questId];
        if (!deposit.isActive) return 0;
        return deposit.amount - deposit.distributed;
    }
    
    /**
     * @notice Check if refund is available for a quest
     * @param questId Quest to check
     */
    function canRefund(bytes32 questId) external view returns (bool) {
        QuestDeposit storage deposit = questDeposits[questId];
        if (!deposit.isActive) return false;
        if (deposit.completionCount > 0) return false;
        if (block.timestamp < deposit.expiresAt + GRACE_PERIOD) return false;
        if (deposit.amount <= deposit.distributed) return false;
        return true;
    }
    
    /**
     * @notice Get payout for a specific winner on a quest
     * @param questId Quest to query
     * @param winner Winner address
     */
    function getWinnerPayout(bytes32 questId, address winner) external view returns (uint256) {
        return winnerPayouts[questId][winner];
    }
    
    /**
     * @notice Get contract TRUST balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Calculate questId from string (helper function)
     * @param questIdString The quest ID string from database
     */
    function calculateQuestId(string calldata questIdString) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(questIdString));
    }
    
    // ============================================
    // RECEIVE FUNCTION
    // ============================================
    
    /// @notice Accept direct TRUST transfers (for gas refunds etc)
    receive() external payable {}
}
