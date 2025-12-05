import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export function useUserXP() {
  const { address } = useAccount();

  const { data: userXP, isLoading, error } = useQuery({
    queryKey: ['user-xp', address],
    queryFn: () => {
      if (!address) return null;
      return apiClient.getUserXP(address);
    },
    enabled: !!address,
    refetchInterval: 30000, // Refetch every 30 seconds to keep progress bar updated
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  return {
    userXP,
    isLoading,
    error,
  };
}
