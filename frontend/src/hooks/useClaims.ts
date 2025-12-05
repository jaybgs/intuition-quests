import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';

// TODO: Implement claims fetching from backend
// For now, return mock data
export function useClaims() {
  const { address } = useAccount();

  const { data: claims, isLoading } = useQuery({
    queryKey: ['user-claims', address],
    queryFn: () => {
      // TODO: Fetch from backend API
      // return apiClient.getUserClaims(address);
      
      // Mock data for now
      return [
        { id: '1', questId: 'quest_001', questTitle: 'DeFi Basics', amount: 5, stakedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { id: '2', questId: 'quest_002', questTitle: 'NFT Fundamentals', amount: 3, stakedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        { id: '3', questId: 'quest_003', questTitle: 'Smart Contracts 101', amount: 7, stakedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      ];
    },
    enabled: !!address,
  });

  return {
    claims: claims || [],
    isLoading,
    activeClaimsCount: claims?.length || 0,
  };
}
