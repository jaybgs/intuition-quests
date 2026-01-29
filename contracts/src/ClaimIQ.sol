// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ClaimIQ
 * @dev Contract for claiming IQ points after completing quests
 * Users pay 1 TRUST to claim, which acts as a deposit in this contract.
 * The deployer/owner can withdraw the accumulated TRUST later.
 * Creates completion triple on MultiVault and awards IQ points
 */

interface IEthMultiVault {
    function createTriples(
        bytes32[] calldata subjectIds,
        bytes32[] calldata predicateIds,
        bytes32[] calldata objectIds,
        uint256[] calldata assets
    ) external payable returns (bytes32[] memory);

    function getTripleCost() external view returns (uint256);
}

contract ClaimIQ is Ownable, ReentrancyGuard {

    // Events
    event QuestClaimed(
        address indexed user,
        bytes32 indexed questId,
        uint256 questAtomId,
        uint256 userAtomId,
        uint256 tripleId,
        uint256 iqAwarded
    );
    
    event FundsWithdrawn(
        address indexed to,
        uint256 amount
    );

    // Constants
    uint256 public constant CLAIM_FEE = 1 ether; // 1 TRUST
    address public immutable revenueWallet;
    address public immutable multiVault;
    uint256 public immutable completedPredicateAtomId;

    // State
    mapping(address => mapping(bytes32 => bool)) public questClaims;
    mapping(address => mapping(bytes32 => uint256)) public questClaimTimestamps;
    mapping(address => mapping(bytes32 => uint256)) public questTripleIds;
    mapping(bytes32 => bool) public validQuestAtoms;

    // Modifiers
    modifier onlyValidQuest(bytes32 questId, uint256 questAtomId) {
        require(validQuestAtoms[bytes32(questAtomId)], "Invalid quest atom");
        _;
    }

    modifier notAlreadyClaimed(address user, bytes32 questId) {
        require(!questClaims[user][questId], "Quest already claimed");
        _;
    }

    modifier correctPayment() {
        require(msg.value == CLAIM_FEE, "Must pay exactly 1 TRUST");
        _;
    }

    constructor(
        address _revenueWallet,
        address _multiVault,
        uint256 _completedPredicateAtomId
    ) {
        require(_revenueWallet != address(0), "Invalid revenue wallet");
        require(_multiVault != address(0), "Invalid MultiVault address");

        revenueWallet = _revenueWallet;
        multiVault = _multiVault;
        completedPredicateAtomId = _completedPredicateAtomId;
    }

    /**
     * @dev Claim completion for a quest
     * Records quest completion on-chain by creating a completion triple
     * Funds are accumulated in the contract instead of auto-forwarded.
     * @param questId The quest identifier
     * @param questAtomId The atom ID of the quest
     * @param userAtomId The atom ID of the user
     * @return tripleId The ID of the created completion triple
     */
    function claimQuest(
        bytes32 questId,
        uint256 questAtomId,
        uint256 userAtomId
    )
        external
        payable
        onlyValidQuest(questId, questAtomId)
        notAlreadyClaimed(msg.sender, questId)
        correctPayment
        nonReentrant
        returns (uint256 tripleId)
    {
        // 1. STATE UPDATES FIRST (Checks-Effects-Interactions)
        // We mark as claimed *before* the external call to avoid reentrancy
        questClaims[msg.sender][questId] = true;
        questClaimTimestamps[msg.sender][questId] = block.timestamp;
        
        // Note: We don't have the tripleId yet, so we'll update that mapping after.
        // But the critical 'questClaims' check is now safe.

        // 2. EXTERNAL CALLS
        // Creates completion triple on MultiVault
        // Triple: User -> Completed -> Quest
        bytes32[] memory subjectIds = new bytes32[](1);
        bytes32[] memory predicateIds = new bytes32[](1);
        bytes32[] memory objectIds = new bytes32[](1);
        uint256[] memory assets = new uint256[](1);

        subjectIds[0] = bytes32(userAtomId);
        predicateIds[0] = bytes32(completedPredicateAtomId);
        objectIds[0] = bytes32(questAtomId);
        assets[0] = 0; // No additional assets for completion triple

        IEthMultiVault vault = IEthMultiVault(multiVault);
        uint256 tripleCost = vault.getTripleCost();
        
        bytes32[] memory tripleIds = vault.createTriples{value: tripleCost}(
            subjectIds,
            predicateIds,
            objectIds,
            assets
        );

        tripleId = uint256(tripleIds[0]);

        // 3. FINAL STATE UPDATE (with result)
        questTripleIds[msg.sender][questId] = tripleId;

        emit QuestClaimed(
            msg.sender,
            questId,
            questAtomId,
            userAtomId,
            tripleId,
            0 
        );

        return tripleId;
    }

    /**
     * @dev Claim IQ-only quest (no escrow/deposit required)
     */
    function claimIQOnlyQuest(
        bytes32 questId,
        uint256 questAtomId,
        uint256 userAtomId
    )
        external
        payable
        notAlreadyClaimed(msg.sender, questId)
        nonReentrant
        returns (uint256 tripleId)
    {
        uint256 feeAmount = CLAIM_FEE;
        require(msg.value >= feeAmount, "Insufficient payment for claim fee");

        // FUNDS ARE KEPT IN THE CONTRACT (No transfer to revenueWallet)

        // Return a dummy triple ID since no triple is created
        tripleId = 0;

        // Record the claim
        questClaims[msg.sender][questId] = true;
        questClaimTimestamps[msg.sender][questId] = block.timestamp;
        questTripleIds[msg.sender][questId] = tripleId;

        emit QuestClaimed(msg.sender, questId, questAtomId, userAtomId, tripleId, 0);

        // Refund any excess payment back to user
        uint256 paymentAmount = msg.value;
        uint256 excess = paymentAmount - feeAmount;
        if (excess > 0) {
            (bool refundSuccess,) = msg.sender.call{value: excess}("");
            require(refundSuccess, "Failed to refund excess payment");
        }
    }

    // ... (View functions remain the same) ...

    function hasClaimedQuest(address user, bytes32 questId) external view returns (bool) {
        return questClaims[user][questId];
    }

    function getQuestClaim(address user, bytes32 questId)
        external
        view
        returns (uint256 tripleId, uint256 claimedAt)
    {
        return (questTripleIds[user][questId], questClaimTimestamps[user][questId]);
    }

    function getClaimCost() external pure returns (uint256) {
        return CLAIM_FEE;
    }

    // Admin functions

    function addValidQuestAtoms(bytes32[] calldata questAtomIds) external onlyOwner {
        for (uint256 i = 0; i < questAtomIds.length; i++) {
            validQuestAtoms[questAtomIds[i]] = true;
        }
    }

    function removeValidQuestAtoms(bytes32[] calldata questAtomIds) external onlyOwner {
        for (uint256 i = 0; i < questAtomIds.length; i++) {
            validQuestAtoms[questAtomIds[i]] = false;
        }
    }

    /**
     * @dev Withdraw fees to the owner or revenue wallet
     * This is the manual withdrawal function requested.
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        // Withdraw to owner (deployer) as requested
        (bool success,) = owner().call{value: balance}("");
        require(success, "Withdraw failed");
        
        emit FundsWithdrawn(owner(), balance);
    }
    
    /** 
     * @dev Legacy emergency withdraw support targeting revenueWallet if preferred 
     */
    function withdrawToRevenueWallet() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success,) = revenueWallet.call{value: balance}("");
        require(success, "Withdraw failed");
        
        emit FundsWithdrawn(revenueWallet, balance);
    }

    // Receive function to accept TRUST payments
    receive() external payable {}
}



