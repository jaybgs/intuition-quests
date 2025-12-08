// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SpaceIdentityFactory
 * @notice Creates identity atoms on Intuition chain for spaces
 * @dev When a user creates a space, this contract creates a unique identity atom on Intuition
 *      using the space name and creation timestamp to ensure uniqueness
 */

interface IEthMultiVault {
    function createAtom(bytes calldata atomData) external payable returns (uint256 atomId);
    function getAtomCost() external view returns (uint256);
}

contract SpaceIdentityFactory {
    // ========================================
    // State Variables
    // ========================================
    
    /// @notice The Intuition MultiVault contract address
    IEthMultiVault public immutable multiVault;
    
    /// @notice Relayer wallet for automated operations
    address public immutable relayerWallet;
    
    /// @notice Mapping from spaceId (hash) to atomId
    mapping(bytes32 => uint256) public spaceAtoms;
    
    /// @notice Mapping from spaceId to creator address
    mapping(bytes32 => address) public spaceCreators;
    
    // ========================================
    // Events
    // ========================================
    
    event SpaceIdentityCreated(
        bytes32 indexed spaceId,
        uint256 indexed atomId,
        string spaceName,
        address indexed creator,
        uint256 createdAt
    );
    
    // ========================================
    // Errors
    // ========================================
    
    error SpaceAlreadyExists(bytes32 spaceId);
    error InsufficientPayment(uint256 required, uint256 provided);
    error ZeroAddress();
    error TransferFailed();
    
    // ========================================
    // Constructor
    // ========================================
    
    constructor(
        address _multiVault,
        address _relayerWallet
    ) {
        if (_multiVault == address(0) || _relayerWallet == address(0)) {
            revert ZeroAddress();
        }
        multiVault = IEthMultiVault(_multiVault);
        relayerWallet = _relayerWallet;
    }
    
    // ========================================
    // External Functions
    // ========================================
    
    /**
     * @notice Creates a unique identity atom for a space on Intuition chain
     * @param spaceName The name of the space
     * @param createdAt Timestamp when the space was created (ensures uniqueness)
     * @return atomId The created atom ID on Intuition
     */
    function createSpaceIdentity(
        string calldata spaceName,
        uint256 createdAt
    ) external payable returns (uint256 atomId) {
        // Generate unique spaceId from name + timestamp
        bytes32 spaceId = keccak256(abi.encodePacked(spaceName, createdAt, msg.sender));
        
        // Check if space already exists
        if (spaceAtoms[spaceId] != 0) {
            revert SpaceAlreadyExists(spaceId);
        }
        
        // Get atom cost
        uint256 atomCost = multiVault.getAtomCost();
        
        if (msg.value < atomCost) {
            revert InsufficientPayment(atomCost, msg.value);
        }
        
        // Create atom data: "space:{spaceName}:{createdAt}"
        bytes memory atomData = abi.encodePacked(
            "space:",
            spaceName,
            ":",
            _uint256ToString(createdAt)
        );
        
        // Create the atom on Intuition
        atomId = multiVault.createAtom{value: atomCost}(atomData);
        
        // Store mappings
        spaceAtoms[spaceId] = atomId;
        spaceCreators[spaceId] = msg.sender;
        
        // Refund excess
        uint256 excess = msg.value - atomCost;
        if (excess > 0) {
            (bool refundSuccess, ) = msg.sender.call{value: excess}("");
            if (!refundSuccess) revert TransferFailed();
        }
        
        emit SpaceIdentityCreated(spaceId, atomId, spaceName, msg.sender, createdAt);
        
        return atomId;
    }
    
    /**
     * @notice Get the atom ID for a space
     * @param spaceId The unique space identifier (hash of name + timestamp + creator)
     * @return atomId The Intuition atom ID
     */
    function getSpaceAtomId(bytes32 spaceId) external view returns (uint256) {
        return spaceAtoms[spaceId];
    }
    
    /**
     * @notice Calculate the space ID from parameters
     * @param spaceName The space name
     * @param createdAt The creation timestamp
     * @param creator The creator address
     * @return spaceId The unique space identifier
     */
    function calculateSpaceId(
        string calldata spaceName,
        uint256 createdAt,
        address creator
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(spaceName, createdAt, creator));
    }
    
    /**
     * @notice Get the cost to create a space identity
     * @return cost The atom creation cost in wei
     */
    function getCreateCost() external view returns (uint256 cost) {
        return multiVault.getAtomCost();
    }
    
    // ========================================
    // Internal Functions
    // ========================================
    
    function _uint256ToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}