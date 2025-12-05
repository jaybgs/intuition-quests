// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title QuestEscrow
 * @notice Escrow contract that holds native TRUST tokens for quest rewards until winners are selected
 * @dev Allows quest creators to deposit native TRUST tokens and distributes them to winners
 */
contract QuestEscrow is Ownable, ReentrancyGuard {
    // Quest deposit information
    struct QuestDeposit {
        address creator;
        uint256 totalAmount;
        uint256 distributedAmount;
        bool isDistributed;
        uint256 numberOfWinners;
    }
    
    // Mapping: questId => QuestDeposit
    mapping(string => QuestDeposit) public questDeposits;
    
    // Mapping: questId => winnerIndex => amount
    mapping(string => mapping(uint256 => uint256)) public winnerAmounts;
    
    // Mapping: questId => winnerIndex => winnerAddress
    mapping(string => mapping(uint256 => address)) public winners;
    
    // Events
    event DepositMade(
        string indexed questId,
        address indexed creator,
        uint256 amount,
        uint256 numberOfWinners
    );
    
    event WinnerSet(
        string indexed questId,
        uint256 indexed winnerIndex,
        address winner,
        uint256 amount
    );
    
    event RewardDistributed(
        string indexed questId,
        address indexed winner,
        uint256 amount
    );
    
    event QuestDistributed(
        string indexed questId,
        uint256 totalDistributed
    );
    
    event DepositRefunded(
        string indexed questId,
        address indexed creator,
        uint256 amount
    );
    
    error InvalidQuestId();
    error InvalidAmount();
    error InvalidWinners();
    error AlreadyDistributed();
    error NotCreator();
    error InsufficientBalance();
    error TransferFailed();
    error InvalidWinnerData();
    
    /**
     * @notice Constructor - no parameters needed for native token
     */
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Deposit native TRUST tokens for a quest
     * @param questId Unique identifier for the quest
     * @param numberOfWinners Number of winners for this quest
     */
    function deposit(
        string memory questId,
        uint256 numberOfWinners
    ) external payable nonReentrant {
        if (bytes(questId).length == 0) revert InvalidQuestId();
        if (msg.value == 0) revert InvalidAmount();
        if (numberOfWinners == 0) revert InvalidWinners();
        
        // Check if quest already has a deposit
        if (questDeposits[questId].totalAmount > 0) {
            revert InvalidQuestId(); // Quest already has deposit
        }
        
        // Store deposit information
        // Native tokens are already in the contract via msg.value
        questDeposits[questId] = QuestDeposit({
            creator: msg.sender,
            totalAmount: msg.value,
            distributedAmount: 0,
            isDistributed: false,
            numberOfWinners: numberOfWinners
        });
        
        emit DepositMade(questId, msg.sender, msg.value, numberOfWinners);
    }
    
    /**
     * @notice Set winners and their prize amounts (can be called multiple times to set all winners)
     * @param questId Quest identifier
     * @param winnerIndex Index of the winner (0-based)
     * @param winnerAddress Address of the winner
     * @param amount Prize amount for this winner
     */
    function setWinner(
        string memory questId,
        uint256 winnerIndex,
        address winnerAddress,
        uint256 amount
    ) external {
        QuestDeposit storage deposit = questDeposits[questId];
        
        if (deposit.totalAmount == 0) revert InvalidQuestId();
        if (deposit.isDistributed) revert AlreadyDistributed();
        if (msg.sender != deposit.creator && msg.sender != owner()) revert NotCreator();
        if (winnerAddress == address(0)) revert InvalidWinnerData();
        if (amount == 0) revert InvalidAmount();
        if (winnerIndex >= deposit.numberOfWinners) revert InvalidWinners();
        
        // Store winner information
        winners[questId][winnerIndex] = winnerAddress;
        winnerAmounts[questId][winnerIndex] = amount;
        
        emit WinnerSet(questId, winnerIndex, winnerAddress, amount);
    }
    
    /**
     * @notice Set multiple winners at once
     * @param questId Quest identifier
     * @param winnerAddresses Array of winner addresses
     * @param amounts Array of prize amounts (must match winnerAddresses length)
     */
    function setWinners(
        string memory questId,
        address[] calldata winnerAddresses,
        uint256[] calldata amounts
    ) external {
        QuestDeposit storage deposit = questDeposits[questId];
        
        if (deposit.totalAmount == 0) revert InvalidQuestId();
        if (deposit.isDistributed) revert AlreadyDistributed();
        if (msg.sender != deposit.creator && msg.sender != owner()) revert NotCreator();
        if (winnerAddresses.length != amounts.length) revert InvalidWinnerData();
        if (winnerAddresses.length > deposit.numberOfWinners) revert InvalidWinners();
        
        for (uint256 i = 0; i < winnerAddresses.length; i++) {
            if (winnerAddresses[i] == address(0)) revert InvalidWinnerData();
            if (amounts[i] == 0) revert InvalidAmount();
            
            winners[questId][i] = winnerAddresses[i];
            winnerAmounts[questId][i] = amounts[i];
            
            emit WinnerSet(questId, i, winnerAddresses[i], amounts[i]);
        }
    }
    
    /**
     * @notice Distribute rewards to all winners
     * @param questId Quest identifier
     */
    function distributeRewards(string memory questId) external nonReentrant {
        QuestDeposit storage deposit = questDeposits[questId];
        
        if (deposit.totalAmount == 0) revert InvalidQuestId();
        if (deposit.isDistributed) revert AlreadyDistributed();
        if (msg.sender != deposit.creator && msg.sender != owner()) revert NotCreator();
        
        uint256 totalDistributed = 0;
        
        // Distribute to each winner
        for (uint256 i = 0; i < deposit.numberOfWinners; i++) {
            address winner = winners[questId][i];
            uint256 amount = winnerAmounts[questId][i];
            
            if (winner != address(0) && amount > 0) {
                // Send native tokens to winner
                (bool success, ) = payable(winner).call{value: amount}("");
                if (!success) revert TransferFailed();
                
                totalDistributed += amount;
                deposit.distributedAmount += amount;
                
                emit RewardDistributed(questId, winner, amount);
            }
        }
        
        deposit.isDistributed = true;
        
        emit QuestDistributed(questId, totalDistributed);
    }
    
    /**
     * @notice Refund deposit to creator (only if not distributed)
     * @param questId Quest identifier
     */
    function refundDeposit(string memory questId) external nonReentrant {
        QuestDeposit storage deposit = questDeposits[questId];
        
        if (deposit.totalAmount == 0) revert InvalidQuestId();
        if (deposit.isDistributed) revert AlreadyDistributed();
        if (msg.sender != deposit.creator && msg.sender != owner()) revert NotCreator();
        
        uint256 refundAmount = deposit.totalAmount;
        deposit.totalAmount = 0;
        
        // Send native tokens back to creator
        (bool success, ) = payable(deposit.creator).call{value: refundAmount}("");
        if (!success) revert TransferFailed();
        
        emit DepositRefunded(questId, deposit.creator, refundAmount);
    }
    
    /**
     * @notice Get deposit information for a quest
     * @param questId Quest identifier
     * @return creator Creator address
     * @return totalAmount Total deposited amount
     * @return distributedAmount Amount already distributed
     * @return isDistributed Whether rewards have been distributed
     * @return numberOfWinners Number of winners
     */
    function getQuestDeposit(string memory questId) external view returns (
        address creator,
        uint256 totalAmount,
        uint256 distributedAmount,
        bool isDistributed,
        uint256 numberOfWinners
    ) {
        QuestDeposit memory deposit = questDeposits[questId];
        return (
            deposit.creator,
            deposit.totalAmount,
            deposit.distributedAmount,
            deposit.isDistributed,
            deposit.numberOfWinners
        );
    }
    
    /**
     * @notice Get winner information
     * @param questId Quest identifier
     * @param winnerIndex Index of the winner
     * @return winnerAddress Winner's address
     * @return amount Prize amount
     */
    function getWinner(string memory questId, uint256 winnerIndex) external view returns (
        address winnerAddress,
        uint256 amount
    ) {
        return (
            winners[questId][winnerIndex],
            winnerAmounts[questId][winnerIndex]
        );
    }
    
    /**
     * @notice Receive native tokens (fallback function)
     */
    receive() external payable {
        // Allow contract to receive native tokens
    }
}
