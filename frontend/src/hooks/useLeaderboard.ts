import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export function useLeaderboard(limit = 100) {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => apiClient.getLeaderboard(limit, 0),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return {
    leaderboard: leaderboard || [],
    isLoading,
  };
}

