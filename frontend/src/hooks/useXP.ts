import { useAccount } from 'wagmi';
import { QuestService } from '../services/questService';
import { useQuery } from '@tanstack/react-query';

const questService = new QuestService();

export function useXP() {
  const { address } = useAccount();

  const { data: userXP, isLoading } = useQuery({
    queryKey: ['user-xp', address],
    queryFn: () => questService.getUserXP(address!),
    enabled: !!address,
  });

  return {
    totalXP: userXP?.totalXP || 0,
    questsCompleted: userXP?.questsCompleted || 0,
    claims: userXP?.claims || [],
    isLoading,
  };
}

