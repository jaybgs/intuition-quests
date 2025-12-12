import { useAccount } from 'wagmi';
import { questServiceSupabase } from '../services/questServiceSupabase';
import { questServiceBackend } from '../services/questServiceBackend';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useQuests() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  
  // Expose queryClient globally for immediate cache invalidation
  if (typeof window !== 'undefined') {
    (window as any).__QUEST_QUERY_CLIENT__ = queryClient;
  }

  const { data: quests, isLoading } = useQuery({
    queryKey: ['quests'],
    queryFn: async () => {
      try {
        // Use Supabase only - no localStorage fallback
        return await questServiceSupabase.getAllQuests();
      } catch (error) {
        console.error('Error fetching quests from Supabase:', error);
        return []; // Return empty array on error instead of blocking
      }
    },
    refetchInterval: 10000, // Reduced to 10 seconds to reduce load
    staleTime: 5000, // Consider data stale after 5 seconds
    retry: 2, // Retry up to 2 times on failure
    retryDelay: 1000, // Wait 1 second between retries
  });

  // User XP is now handled by useUserXP hook
  // Keeping this for backward compatibility but it will be empty
  const userXP = null;

  const completeQuestMutation = useMutation({
    mutationFn: (questId: string) =>
      questServiceBackend.completeQuest(questId, address!),
    onSuccess: async () => {
      // Invalidate and refetch queries to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: ['user-xp', address] });
      await queryClient.refetchQueries({ queryKey: ['user-xp', address] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });

  const createQuestMutation = useMutation({
    mutationFn: (data: {
      projectId: string;
      projectName: string;
      title: string;
      description: string;
      xpReward: number;
      requirements: any[];
      twitterLink?: string; // Optional X profile URL
    }) => {
      // Get creator's X profile URL from:
      // 1. Explicitly passed twitterLink
      // 2. Space builder stored URL
      // 3. Social connections (fallback)
      let twitterLink = data.twitterLink;
      
      if (!twitterLink && address) {
        // Try to get from space builder
        const spaceUrl = localStorage.getItem(`space_twitter_url_${address.toLowerCase()}`);
        if (spaceUrl) {
          twitterLink = spaceUrl;
        } else {
          // Fallback to social connections
          twitterLink = connections.twitter?.profileUrl;
        }
      }
      
      return questServiceBackend.createQuest(
        data.projectId,
        data.projectName,
        data.title,
        data.description,
        data.xpReward,
        data.requirements,
        undefined, // trustReward
        undefined, // maxCompletions
        undefined, // expiresAt
        twitterLink // Include creator's X profile URL
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });

  return {
    quests: quests || [],
    userXP,
    isLoading,
    completeQuest: completeQuestMutation.mutateAsync,
    createQuest: createQuestMutation.mutate,
    isCompleting: completeQuestMutation.isPending,
    isCreating: createQuestMutation.isPending,
  };
}

