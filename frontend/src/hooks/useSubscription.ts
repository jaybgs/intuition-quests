import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { subscriptionService, type SubscriptionTier } from '../services/subscriptionService';

export function useSubscription() {
  const { address } = useAccount();
  const [tier, setTier] = useState<SubscriptionTier>('free');

  useEffect(() => {
    if (address) {
      const currentTier = subscriptionService.getSubscription(address);
      setTier(currentTier);
    } else {
      setTier('free');
    }
  }, [address]);

  const upgradeToPro = () => {
    if (!address) return;
    subscriptionService.setSubscription(address, 'pro');
    setTier('pro');
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
    upgradeToPro,
    downgradeToFree,
  };
}

