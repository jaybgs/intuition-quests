// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TransactionWrapper
 * @notice Wrapper contract that collects 30% dApp fee on top of base gas fees for all MultiVault transactions
 * @dev This contract wraps MultiVault operations and automatically collects fees
 * 
 * Fee Model:
 * - User pays: operation cost + base gas fee + (base gas fee * 30%)
 * - The 30% dApp fee goes to the revenue wallet (0xec48e65C2AD6d242F173467EC3edc7AAD78CFA07)
 * - Example: If gas fee is 0.1 TRUST, user pays 0.13 TRUST (0.1 + 0.03)
 */
interface IMultiVault {
    function createAtoms(
        bytes[] calldata atomDatas,
        uint256[] calldata assets
    ) external payable returns (bytes32[] memory);

    function createTriples(
        bytes32[] calldata subjectIds,
        bytes32[] calldata predicateIds,
        bytes32[] calldata objectIds,
        uint256[] calldata assets
    ) external payable returns (bytes32[] memory);

    function deposit(
        address receiver,
        bytes32 termId,
        uint256 curveId,
        uint256 minShares
    ) external payable returns (uint256);

    function depositBatch(
        address receiver,
        bytes32[] calldata termIds,
        uint256[] calldata curveIds,
        uint256[] calldata minShares
    ) external payable returns (uint256[] memory);

    function getAtomCost() external view returns (uint256);
    function getTripleCost() external view returns (uint256);
}

contract TransactionWrapper {
    IMultiVault public immutable multiVault;
    address public immutable revenueWallet;
    uint256 public constant DAPP_FEE_PERCENTAGE = 30; // 30%
    uint256 public constant FEE_DENOMINATOR = 100;

    event FeeCollected(
        address indexed user,
        string indexed operation,
        uint256 baseGasCost,
        uint256 dAppFeeAmount,
        uint256 totalCharged
    );

    event OperationExecuted(
        address indexed user,
        string indexed operation,
        bytes32 indexed resultId
    );

    error InsufficientValue(string operation, uint256 required, uint256 provided);
    error FeeTransferFailed();
    error RefundFailed();

    constructor(address _multiVault, address _revenueWallet) {
        require(_multiVault != address(0), "Invalid MultiVault address");
        require(_revenueWallet != address(0), "Invalid revenue wallet address");
        multiVault = IMultiVault(_multiVault);
        revenueWallet = _revenueWallet;
    }

    /**
     * @notice Create atoms with dApp fee collection
     * @param atomDatas Array of atom data
     * @param assets Array of asset amounts (total value per atom: base cost + deposit)
     * @return Array of atom IDs
     * @dev User must send: sum(assets) + base gas fee + (base gas fee * 30%)
     *      The assets array should contain the total value per atom (getAtomCost() + deposit)
     */
    function createAtomsWithFee(
        bytes[] calldata atomDatas,
        uint256[] calldata assets
    ) external payable returns (bytes32[] memory) {
        require(atomDatas.length == assets.length, "Arrays length mismatch");
        require(atomDatas.length > 0, "No atoms to create");
        
        // Calculate total operation cost (sum of all assets)
        uint256 totalOperationCost = 0;
        for (uint256 i = 0; i < assets.length; i++) {
            totalOperationCost += assets[i];
        }
        
        // Verify minimum value: each asset must be at least getAtomCost()
        uint256 atomCost = multiVault.getAtomCost();
        uint256 minRequired = atomCost * uint256(atomDatas.length);
        if (totalOperationCost < minRequired) {
            revert InsufficientValue("createAtoms", minRequired, totalOperationCost);
        }
        
        // Execute atom creation with operation cost
        bytes32[] memory atomIds = multiVault.createAtoms{value: totalOperationCost}(
            atomDatas,
            assets
        );
        
        // Calculate fees from remaining balance
        // Remaining = msg.value - totalOperationCost
        // This remaining should be: estimated gas + (estimated gas * 30%)
        // We extract the dApp fee (30% of estimated gas) and send it to revenue wallet
        // The actual gas will be paid automatically from the remaining balance
        uint256 remainingBalance = msg.value - totalOperationCost;
        
        // Calculate dApp fee: if remaining = gas + (gas * 30%) = gas * 1.3
        // Then: dAppFee = (remaining * 30) / 130 = remaining * 30 / 130
        uint256 dAppFee = (remainingBalance * DAPP_FEE_PERCENTAGE) / (FEE_DENOMINATOR + DAPP_FEE_PERCENTAGE);
        uint256 estimatedBaseGas = remainingBalance - dAppFee;
        
        // Transfer dApp fee to revenue wallet immediately
        if (dAppFee > 0) {
            (bool success, ) = revenueWallet.call{value: dAppFee}("");
            if (!success) {
                revert FeeTransferFailed();
                }
            }
        
        // The remaining balance (estimatedBaseGas) will be used for actual gas payment
        // Any excess after gas payment will be refunded automatically by the EVM
        // We don't need to manually refund here as the contract will have minimal balance left
        
        emit FeeCollected(msg.sender, "createAtoms", estimatedBaseGas, dAppFee, msg.value);
        if (atomIds.length > 0) {
            emit OperationExecuted(msg.sender, "createAtoms", atomIds[0]);
        }
        
        return atomIds;
    }

    /**
     * @notice Create triples with dApp fee collection
     * @param subjectIds Array of subject atom IDs
     * @param predicateIds Array of predicate atom IDs
     * @param objectIds Array of object atom IDs
     * @param assets Array of asset amounts (total value per triple: base cost + deposit)
     * @return Array of triple IDs
     * @dev User must send: sum(assets) + base gas fee + (base gas fee * 30%)
     */
    function createTriplesWithFee(
        bytes32[] calldata subjectIds,
        bytes32[] calldata predicateIds,
        bytes32[] calldata objectIds,
        uint256[] calldata assets
    ) external payable returns (bytes32[] memory) {
        require(
            subjectIds.length == predicateIds.length &&
            subjectIds.length == objectIds.length &&
            subjectIds.length == assets.length,
            "Arrays length mismatch"
        );
        require(subjectIds.length > 0, "No triples to create");
        
        // Calculate total operation cost (sum of all assets)
        uint256 totalOperationCost = 0;
        for (uint256 i = 0; i < assets.length; i++) {
            totalOperationCost += assets[i];
        }
        
        // Verify minimum value: each asset must be at least getTripleCost()
        uint256 tripleCost = multiVault.getTripleCost();
        uint256 minRequired = tripleCost * uint256(subjectIds.length);
        if (totalOperationCost < minRequired) {
            revert InsufficientValue("createTriples", minRequired, totalOperationCost);
        }
        
        // Execute triple creation with operation cost
        bytes32[] memory tripleIds = multiVault.createTriples{value: totalOperationCost}(
            subjectIds,
            predicateIds,
            objectIds,
            assets
        );
        
        // Calculate fees from remaining balance
        uint256 remainingBalance = msg.value - totalOperationCost;
        uint256 dAppFee = (remainingBalance * DAPP_FEE_PERCENTAGE) / (FEE_DENOMINATOR + DAPP_FEE_PERCENTAGE);
        uint256 estimatedBaseGas = remainingBalance - dAppFee;
                
        // Transfer dApp fee to revenue wallet immediately
        if (dAppFee > 0) {
            (bool success, ) = revenueWallet.call{value: dAppFee}("");
            if (!success) {
                revert FeeTransferFailed();
            }
        }
        
        emit FeeCollected(msg.sender, "createTriples", estimatedBaseGas, dAppFee, msg.value);
        if (tripleIds.length > 0) {
            emit OperationExecuted(msg.sender, "createTriples", tripleIds[0]);
        }
        
        return tripleIds;
    }

    /**
     * @notice Deposit into a vault with dApp fee collection
     * @param receiver Address to receive shares
     * @param termId Vault term ID (atom or triple)
     * @param curveId Bonding curve ID
     * @param minShares Minimum shares expected
     * @param depositAmount Amount to deposit
     * @return shares Amount of shares minted
     * @dev User must send: depositAmount + base gas fee + (base gas fee * 30%)
     */
    function depositWithFee(
        address receiver,
        bytes32 termId,
        uint256 curveId,
        uint256 minShares,
        uint256 depositAmount
    ) external payable returns (uint256) {
        require(msg.value > depositAmount, "Must send deposit + fees");
        require(depositAmount > 0, "Deposit amount must be > 0");
        
        // Execute deposit
        uint256 shares = multiVault.deposit{value: depositAmount}(
            receiver,
            termId,
            curveId,
            minShares
        );
        
        require(shares >= minShares, "Insufficient shares received");
        
        // Calculate fees from remaining balance
        uint256 remainingBalance = msg.value - depositAmount;
        uint256 dAppFee = (remainingBalance * DAPP_FEE_PERCENTAGE) / (FEE_DENOMINATOR + DAPP_FEE_PERCENTAGE);
        uint256 estimatedBaseGas = remainingBalance - dAppFee;
        
        // Transfer dApp fee to revenue wallet immediately
        if (dAppFee > 0) {
            (bool success, ) = revenueWallet.call{value: dAppFee}("");
            if (!success) {
                revert FeeTransferFailed();
            }
        }
        
        emit FeeCollected(msg.sender, "deposit", estimatedBaseGas, dAppFee, msg.value);
        emit OperationExecuted(msg.sender, "deposit", termId);
        
        return shares;
    }

    /**
     * @notice Batch deposit with dApp fee collection
     * @param receiver Address to receive shares
     * @param termIds Array of vault term IDs
     * @param curveIds Array of bonding curve IDs
     * @param minShares Array of minimum shares expected
     * @param totalDepositAmount Total amount to deposit across all operations
     * @return shares Array of shares minted
     * @dev User must send: totalDepositAmount + base gas fee + (base gas fee * 30%)
     */
    function depositBatchWithFee(
        address receiver,
        bytes32[] calldata termIds,
        uint256[] calldata curveIds,
        uint256[] calldata minShares,
        uint256 totalDepositAmount
    ) external payable returns (uint256[] memory) {
        require(msg.value > totalDepositAmount, "Must send deposits + fees");
        require(totalDepositAmount > 0, "Deposit amount must be > 0");
        require(
            termIds.length == curveIds.length && termIds.length == minShares.length,
            "Array length mismatch"
        );
        
        // Execute batch deposit
        uint256[] memory shares = multiVault.depositBatch{value: totalDepositAmount}(
            receiver,
            termIds,
            curveIds,
            minShares
        );
        
        // Calculate fees from remaining balance
        uint256 remainingBalance = msg.value - totalDepositAmount;
        uint256 dAppFee = (remainingBalance * DAPP_FEE_PERCENTAGE) / (FEE_DENOMINATOR + DAPP_FEE_PERCENTAGE);
        uint256 estimatedBaseGas = remainingBalance - dAppFee;
        
        // Transfer dApp fee to revenue wallet immediately
        if (dAppFee > 0) {
            (bool success, ) = revenueWallet.call{value: dAppFee}("");
            if (!success) {
                revert FeeTransferFailed();
            }
        }
        
        emit FeeCollected(msg.sender, "depositBatch", estimatedBaseGas, dAppFee, msg.value);
        if (termIds.length > 0) {
            emit OperationExecuted(msg.sender, "depositBatch", termIds[0]);
        }
        
        return shares;
    }

    /**
     * @notice Emergency function to withdraw stuck funds (only revenue wallet)
     */
    function emergencyWithdraw() external {
        require(msg.sender == revenueWallet, "Only revenue wallet");
        (bool success, ) = revenueWallet.call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @notice Receive function to accept TRUST tokens
     */
    receive() external payable {}
}
