/**
 * Trust Quests Payment Service
 * Handles pro subscription payments with TRUST tokens
 */

import { type Address, parseEther, formatEther } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts/addresses';
import { TRUST_QUESTS_PAYMENT_ABI } from '../contracts/abis';
import { TRUST_TOKEN_ADDRESS } from '../App';
import { apiClient } from './apiClient';

export interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Pay for pro subscription using TRUST tokens
 */
export async function payForProSubscription(
  walletClient: any,
  publicClient: any
): Promise<PaymentResult> {
  try {
    const contractAddress = CONTRACT_ADDRESSES.TRUST_QUESTS_PAYMENT;
    const userAddress = walletClient.account.address;

    console.log('🔄 Starting payment process for:', userAddress);

    // Check if contract is deployed
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error('TrustQuestsPayment contract not deployed yet. Please contact support.');
    }

    // First, check if user already has pro
    console.log('🔍 Checking if user already has pro subscription...');
    const isAlreadyPro = await checkProStatus(publicClient, userAddress);
    if (isAlreadyPro) {
      console.log('✅ User already has pro subscription on blockchain');
      return { success: true, txHash: 'already-pro' };
    }

    // Check TRUST token balance before proceeding
    console.log('💰 Checking TRUST balance (native token on Intuition)...');
    // TRUST is the native token on Intuition network, so check native balance
    const userBalance = await publicClient.getBalance({
      address: userAddress
    });

    const requiredAmount = parseEther('200');

    console.log('Required amount:', requiredAmount.toString(), 'wei (200 TRUST)');
    console.log('User balance:', userBalance.toString(), 'wei');

    if (userBalance < requiredAmount) {
      const shortfall = requiredAmount - userBalance;
      throw new Error(`Insufficient TRUST balance. You need ${formatEther(shortfall)} more TRUST tokens.`);
    }

    console.log('✅ Sufficient balance confirmed');

    // Pay for pro subscription with native TRUST tokens
    console.log('🔄 Processing pro subscription payment...');
    const payTx = await walletClient.writeContract({
      address: contractAddress,
      abi: TRUST_QUESTS_PAYMENT_ABI,
      functionName: 'payForPro',
      value: requiredAmount // Send native tokens with the transaction
    });

    console.log('📝 Payment transaction sent:', payTx);

    // Wait for payment confirmation
    console.log('⏳ Waiting for payment confirmation...');
    const payReceipt = await publicClient.waitForTransactionReceipt({ hash: payTx });
    console.log('✅ Payment confirmed:', payReceipt.status);

    if (payReceipt.status !== 'success') {
      throw new Error('Payment transaction failed - please check your transaction');
    }

    // Save to database after successful blockchain transaction
    console.log('💾 Saving pro subscription to database...');
    try {
      await apiClient.post('/subscription/pro-payment', {
        walletAddress: userAddress,
        txHash: payTx,
        amount: requiredAmount.toString(),
        timestamp: new Date().toISOString()
      });
      console.log('✅ Database record created successfully');
    } catch (dbError: any) {
      console.error('❌ Failed to save to database:', dbError);
      // Don't fail the payment if database save fails, but log it
      // The user still gets pro features, but they might need support to fix the database record
    }

    console.log('🎉 Payment completed successfully!');

    return {
      success: true,
      txHash: payTx
    };

  } catch (error: any) {
    console.error('❌ Pro subscription payment failed:', error);

    // Provide more specific error messages
    let errorMessage = error.message || 'Payment failed';

    if (error.message?.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds for transaction gas fee';
    } else if (error.message?.includes('User rejected')) {
      errorMessage = 'Transaction was cancelled by user';
    } else if (error.message?.includes('Insufficient TRUST balance')) {
      // Keep the specific error message
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Check if user has pro subscription
 */
export async function checkProStatus(
  publicClient: any,
  userAddress: Address
): Promise<boolean> {
  try {
    const contractAddress = CONTRACT_ADDRESSES.TRUST_QUESTS_PAYMENT;

    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      return false; // Contract not deployed
    }

    const isPro = await publicClient.readContract({
      address: contractAddress,
      abi: TRUST_QUESTS_PAYMENT_ABI,
      functionName: 'isProUser',
      args: [userAddress]
    });

    return isPro as boolean;
  } catch (error) {
    console.error('Failed to check pro status:', error);
    return false;
  }
}

/**
 * Get contract TRUST token balance
 */
export async function getContractBalance(publicClient: any): Promise<string> {
  try {
    const contractAddress = CONTRACT_ADDRESSES.TRUST_QUESTS_PAYMENT;

    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      return '0'; // Contract not deployed
    }

    const balance = await publicClient.readContract({
      address: contractAddress,
      abi: TRUST_QUESTS_PAYMENT_ABI,
      functionName: 'getContractBalance'
    });

    return formatEther(balance as bigint);
  } catch (error) {
    console.error('Failed to get contract balance:', error);
    return '0';
  }
}

/**
 * Pay 1 TRUST fee for quest creation (Free users only)
 * Calls the FeeCollector smart contract
 */
export async function payQuestCreationFee(
  walletClient: any,
  publicClient: any
): Promise<PaymentResult> {
  try {
    const { FEE_COLLECTOR_ABI } = await import('../contracts/abis');
    const contractAddress = CONTRACT_ADDRESSES.FEE_COLLECTOR;
    // Fallback if address is placeholder/invalid
    if (!contractAddress || contractAddress.length < 42 || contractAddress === '0x1234567890123456789012345678901234567890') {
      console.warn('FeeCollector contract not properly deployed/configured. Skipping fee for dev mode.');
      return { success: true, txHash: 'dev-mode-skip' };
    }

    const userAddress = walletClient.account.address;
    const FEE_AMOUNT = parseEther('1'); // 1 TRUST fee

    console.log('🔄 Starting quest creation fee payment (Contract)...');
    console.log('  Contract:', contractAddress);

    // Check balance
    const userBalance = await publicClient.getBalance({ address: userAddress });
    if (userBalance < FEE_AMOUNT) {
      throw new Error(`Insufficient TRUST balance. You need ${formatEther(FEE_AMOUNT)} TRUST to publish this quest.`);
    }

    // Call payFee function on contract
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: FEE_COLLECTOR_ABI,
      functionName: 'payFee',
      value: FEE_AMOUNT
    });

    console.log('📝 Fee transaction sent:', hash);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status !== 'success') {
      throw new Error('Fee transaction failed');
    }

    console.log('✅ Quest creation fee paid successfully via Contract!');

    return { success: true, txHash: hash };

  } catch (error: any) {
    console.error('❌ Quest creation fee payment failed:', error);
    return {
      success: false,
      error: error.message || 'Fee payment failed'
    };
  }
}


