import { useAccount } from 'wagmi';
import { IntuitionService } from '../services/intuitionService';
import { useQuery } from '@tanstack/react-query';

export function useIntuition() {
  const { address } = useAccount();
  const intuitionService = new IntuitionService();

  const { data: claims, isLoading } = useQuery({
    queryKey: ['intuition-claims', address],
    queryFn: () => intuitionService.getUserClaims(address!),
    enabled: !!address,
  });

  return {
    claims: claims || [],
    isLoading,
  };
}

