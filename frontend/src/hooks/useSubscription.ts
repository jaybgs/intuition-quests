import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { subscriptionService, type SubscriptionTier } from '../services/subscriptionService';
import { payForProSubscription, checkProStatus } from '../services/trustQuestsPaymentService';

export function useSubscription() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (address) {
      // Check both local state and blockchain
      const localTier = subscriptionService.getSubscription(address);
      checkBlockchainProStatus();

      // Use blockchain status if available, otherwise fall back to local
      setTier(localTier);
    } else {
      setTier('free');
    }
  }, [address]);

  const checkBlockchainProStatus = async () => {
    if (address && publicClient) {
      try {
        const blockchainPro = await checkProStatus(publicClient, address as `0x${string}`);
        if (blockchainPro) {
          // Update local state to match blockchain
          subscriptionService.setSubscription(address, 'pro');
          setTier('pro');
        }
      } catch (error) {
        console.warn('Could not check blockchain pro status:', error);
      }
    }
  };

  const upgradeToPro = async () => {
    if (!address || !walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    // First, check if user already has pro status on blockchain
    try {
      const blockchainPro = await checkProStatus(publicClient, address as `0x${string}`);
      if (blockchainPro) {
        // User already has pro on blockchain, just update local state
        subscriptionService.setSubscription(address, 'pro');
        setTier('pro');
        return { success: true, txHash: 'already-pro' };
      }
    } catch (error) {
      console.warn('Could not check blockchain pro status:', error);
      // Continue with payment if we can't check
    }

    setIsPaying(true);
    try {
      console.log('🔄 Starting pro subscription payment...');
      const result = await payForProSubscription(walletClient, publicClient);
      console.log('💰 Payment result:', result);

      if (result.success) {
        console.log('✅ Payment successful, updating subscription status');
        // Update local state only after successful blockchain payment
        subscriptionService.setSubscription(address, 'pro');
        setTier('pro');

        // Double-check blockchain status after payment
        try {
          const verifiedPro = await checkProStatus(publicClient, address as `0x${string}`);
          if (!verifiedPro) {
            console.error('❌ Blockchain verification failed - payment may not have completed');
            // Don't update local state if blockchain doesn't confirm
            subscriptionService.setSubscription(address, 'free');
            setTier('free');
            throw new Error('Payment verification failed - please check your transaction');
          }
        } catch (verifyError) {
          console.warn('Could not verify payment on blockchain:', verifyError);
          // For now, trust the transaction result if verification fails
        }

        return { success: true, txHash: result.txHash };
      } else {
        console.error('❌ Payment failed:', result.error);
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('💥 Pro upgrade failed:', error);
      // Ensure local state remains free on any error
      subscriptionService.setSubscription(address, 'free');
      setTier('free');
      throw error;
    } finally {
      setIsPaying(false);
    }
  };

  const downgradeToFree = () => {
    if (!address) return;
    subscriptionService.setSubscription(address, 'free');
    setTier('free');
  };

  return {
    tier,
    isPro: tier === 'pro',
    isFree: tier === 'free',
    isPaying,
    upgradeToPro,
    downgradeToFree,
  };
}

