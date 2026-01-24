// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ClaimIQ
 * @dev Contract for claiming IQ points after completing quests
 * Users pay 1 TRUST to claim, which gets sent to revenue wallet
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

contract ClaimIQ {

    // Events
    event QuestClaimed(
        address indexed user,
        bytes32 indexed questId,
        uint256 questAtomId,
        uint256 userAtomId,
        uint256 tripleId,
        uint256 iqAwarded
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
     * IQ awarding is handled off-chain by the platform
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
        returns (uint256 tripleId)
    {
        // Transfer 1 TRUST to revenue wallet
        (bool success,) = revenueWallet.call{value: msg.value}("");
        require(success, "Failed to send TRUST to revenue wallet");

        // Create completion triple on MultiVault
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

        // Record the claim
        questClaims[msg.sender][questId] = true;
        questClaimTimestamps[msg.sender][questId] = block.timestamp;
        questTripleIds[msg.sender][questId] = tripleId;

        // Emit event (IQ awarding handled off-chain)
        emit QuestClaimed(
            msg.sender,
            questId,
            questAtomId,
            userAtomId,
            tripleId,
            0  // IQ amount is 0 since it's handled off-chain
        );

        return tripleId;
    }

    /**
     * @dev Check if user has claimed a specific quest
     * @param user The user address
     * @param questId The quest identifier
     * @return True if claimed, false otherwise
     */
    function hasClaimedQuest(address user, bytes32 questId) external view returns (bool) {
        return questClaims[user][questId];
    }


    /**
     * @dev Get quest claim details
     * @param user The user address
     * @param questId The quest identifier
     * @return tripleId The triple ID of the claim
     * @return claimedAt The timestamp when claimed
     */
    function getQuestClaim(address user, bytes32 questId)
        external
        view
        returns (uint256 tripleId, uint256 claimedAt)
    {
        return (questTripleIds[user][questId], questClaimTimestamps[user][questId]);
    }

    /**
     * @dev Get the claim cost (1 TRUST)
     * @return The cost in wei
     */
    function getClaimCost() external pure returns (uint256) {
        return CLAIM_FEE;
    }

    /**
     * @dev Claim IQ-only quest (no escrow/deposit required)
     * @param questId The quest identifier
     * @param questAtomId The atom ID of the quest
     * @param userAtomId The atom ID of the user
     * @return tripleId The ID of the created completion triple
     */
    function claimIQOnlyQuest(
        bytes32 questId,
        uint256 questAtomId,
        uint256 userAtomId
    )
        external
        payable
        notAlreadyClaimed(msg.sender, questId)
        returns (uint256 tripleId)
    {
        // For IQ-only quests, we still collect the revenue fee
        uint256 feeAmount = CLAIM_FEE;
        require(msg.value >= feeAmount, "Insufficient payment for claim fee");

        // Transfer 1 TRUST to revenue wallet
        (bool success,) = revenueWallet.call{value: feeAmount}("");
        require(success, "Failed to send TRUST to revenue wallet");

        // Return a dummy triple ID since no triple is created
        tripleId = 0;

        // Record the claim
        questClaims[msg.sender][questId] = true;
        questClaimTimestamps[msg.sender][questId] = block.timestamp;
        questTripleIds[msg.sender][questId] = tripleId;

        // Emit event (IQ awarding handled off-chain)
        emit QuestClaimed(msg.sender, questId, questAtomId, userAtomId, tripleId, 0);

        // Refund any excess payment back to user
        uint256 paymentAmount = msg.value;
        uint256 excess = paymentAmount - feeAmount;
        if (excess > 0) {
            (bool refundSuccess,) = msg.sender.call{value: excess}("");
            require(refundSuccess, "Failed to refund excess payment");
        }
    }

    /**
     * @dev Add valid quest atoms (admin function)
     * @param questAtomIds Array of quest atom IDs to mark as valid
     */
    function addValidQuestAtoms(bytes32[] calldata questAtomIds) external {
        // TODO: Add admin modifier
        for (uint256 i = 0; i < questAtomIds.length; i++) {
            validQuestAtoms[questAtomIds[i]] = true;
        }
    }

    /**
     * @dev Remove valid quest atoms (admin function)
     * @param questAtomIds Array of quest atom IDs to remove
     */
    function removeValidQuestAtoms(bytes32[] calldata questAtomIds) external {
        // TODO: Add admin modifier
        for (uint256 i = 0; i < questAtomIds.length; i++) {
            validQuestAtoms[questAtomIds[i]] = false;
        }
    }

    /**
     * @dev Emergency withdraw function (admin only)
     */
    function emergencyWithdraw() external {
        require(msg.sender == revenueWallet, "Only revenue wallet can withdraw");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success,) = revenueWallet.call{value: balance}("");
        require(success, "Emergency withdraw failed");
    }

    /**
     * @dev Emergency withdraw to deployer (for stuck funds recovery)
     */
    function emergencyWithdrawToDeployer() external {
        // Allow anyone to call this for stuck funds recovery
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        // Send to deployer (the address that deployed this contract)
        address payable deployer = payable(0x80D291e82C6f8a11cEC9A9BA699285AFe14d7F4D);
        (bool success,) = deployer.call{value: balance}("");
        require(success, "Emergency withdraw to deployer failed");
    }

    // Receive function to accept TRUST payments
    receive() external payable {}
}
