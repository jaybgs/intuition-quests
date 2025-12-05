import { useAccount, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { IntuitionService } from '../services/intuitionService';
import { useState, useEffect } from 'react';

/**
 * Hook to verify if the connected wallet has staked on any claim
 */
export function useStakingVerification() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasStaked, setHasStaked] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intuitionService = new IntuitionService();

  const verifyStaking = async (userAddress?: string): Promise<boolean> => {
    const addr = userAddress || address;
    if (!addr || !isConnected) {
      setError('Wallet not connected');
      return false;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const hasStakedResult = await intuitionService.verifyStakedOnClaim(addr as `0x${string}`);
      setHasStaked(hasStakedResult);
      return hasStakedResult;
    } catch (err: any) {
      console.error('Error verifying staking:', err);
      setError(err?.message || 'Failed to verify staking');
      setHasStaked(false);
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-verify when address changes
  useEffect(() => {
    if (address && isConnected && publicClient) {
      verifyStaking();
    } else {
      setHasStaked(null);
      setError(null);
    }
  }, [address, isConnected, publicClient]);

  return {
    hasStaked,
    isVerifying,
    error,
    verifyStaking,
    refetch: () => verifyStaking(),
  };
}



