import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { apiClient } from '../services/apiClient';
import { QuestServiceBackend } from '../services/questServiceBackend';
import type { Address } from 'viem';

const questService = new QuestServiceBackend();

interface BuilderStats {
  questsLaunched: number;
  rewardsDistributed: number; // Total TRUST distributed to winners (from completions)
  totalCompletions: number;
  isLoading: boolean;
}

/**
 * Hook to fetch builder statistics for a creator
 * Combines data from both backend API and localStorage (quests)
 */
export function useBuilderStats(creatorAddress?: Address): BuilderStats {
  const { address } = useAccount();
  const [stats, setStats] = useState<BuilderStats>({
    questsLaunched: 0,
    rewardsDistributed: 0,
    totalCompletions: 0,
    isLoading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const targetAddress = creatorAddress || address;
      if (!targetAddress) {
        setStats({
          questsLaunched: 0,
          rewardsDistributed: 0,
          totalCompletions: 0,
          isLoading: false,
        });
        return;
      }

      try {
        setStats(prev => ({ ...prev, isLoading: true }));

        // Fetch all quests from database filtered by creator
        const allQuests = await questService.getAllQuests();
        const creatorQuests = allQuests.filter(
          q => q.creatorAddress?.toLowerCase() === targetAddress.toLowerCase()
        );

        // Also check localStorage for published quests
        let localQuests: any[] = [];
          try {
          // Check regular quests
          const storedQuests = localStorage.getItem('quests');
          if (storedQuests) {
            const parsedQuests = JSON.parse(storedQuests);
            const localCreatorQuests = parsedQuests.filter((q: any) => 
              q.creatorAddress?.toLowerCase() === targetAddress.toLowerCase()
            );
            localQuests.push(...localCreatorQuests);
            }
          
          // Check published quests (from quest builder, stored separately if needed)
          // Note: Regular quests are typically stored in backend, but check localStorage too
          const publishedQuestsKey = `published_quests_${targetAddress.toLowerCase()}`;
          const storedPublishedQuests = localStorage.getItem(publishedQuestsKey);
          if (storedPublishedQuests) {
            const parsedPublishedQuests = JSON.parse(storedPublishedQuests);
            parsedPublishedQuests.forEach((quest: any) => {
              if (quest.creatorAddress?.toLowerCase() === targetAddress.toLowerCase()) {
                localQuests.push(quest);
              }
            });
          }
        } catch (error) {
          console.warn('Error reading quests from localStorage:', error);
}

        // Combine backend and localStorage quests, removing duplicates
        const allCreatorQuests = [...creatorQuests];
        const seenIds = new Set(creatorQuests.map(q => q.id));
        localQuests.forEach((localQuest: any) => {
          if (!seenIds.has(localQuest.id)) {
            allCreatorQuests.push(localQuest);
            seenIds.add(localQuest.id);
          }
        });

        // Count quests launched (all quests created by user)
        const questsLaunched = allCreatorQuests.length;

        // Calculate total TRUST distributed to winners and total completions
        // Sum up trustEarned from quest completions (actual rewards given, not deposits)
        let rewardsDistributed = 0;
        let totalCompletions = 0;
        
        // From backend quest completions
        for (const quest of creatorQuests) {
          try {
            const completions = await apiClient.getQuestCompletions(quest.id, 1000);
            if (completions && Array.isArray(completions)) {
              // Count completions
              totalCompletions += completions.length;
              
              // Sum up distributed rewards from completions
              completions.forEach((completion: any) => {
                if (completion.trustEarned) {
                  const trustAmount = typeof completion.trustEarned === 'string' 
                    ? parseFloat(completion.trustEarned) 
                    : Number(completion.trustEarned) || 0;
                  if (!isNaN(trustAmount) && trustAmount > 0) {
                    rewardsDistributed += trustAmount;
                  }
                }
              });
            }
          } catch (error) {
            // If completions endpoint fails, use the completedBy array length as fallback
            totalCompletions += quest.completedBy?.length || 0;
            console.warn(`Could not fetch completions for quest ${quest.id}:`, error);
          }
        }

        // For localStorage quests, we can't accurately track distributed rewards
        // since completion data with trustEarned isn't stored there. Only backend completions count.
        // But we can still count completions from localStorage

        // From localStorage quests (completions might not be stored, but check anyway)
        localQuests.forEach((quest: any) => {
          if (quest.completedBy && Array.isArray(quest.completedBy)) {
            totalCompletions += quest.completedBy.length;
            }
          // Check if there's a completion count
          if (quest.completions && typeof quest.completions === 'number') {
            totalCompletions += quest.completions;
          }
        });

        setStats({
          questsLaunched,
          rewardsDistributed,
          totalCompletions,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error fetching builder stats:', error);
        setStats({
          questsLaunched: 0,
          rewardsDistributed: 0,
          totalCompletions: 0,
          isLoading: false,
        });
      }
    };

    fetchStats();

    // Listen for quest publication events to refresh stats
    const handleQuestPublished = () => {
      fetchStats();
    };

    window.addEventListener('questPublished', handleQuestPublished);

    return () => {
      window.removeEventListener('questPublished', handleQuestPublished);
    };
  }, [creatorAddress, address]);

  return stats;
}