import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { QuestServiceBackend } from '../services/questServiceBackend';
import type { Address } from 'viem';

const questService = new QuestServiceBackend();

/**
 * Hook to get the count of active quests created by the current user
 * Used to enforce free plan limitations (max 1 active quest)
 */
export function useActiveQuestCount(spaceId?: string): number {
  const { address } = useAccount();
  const [activeQuestCount, setActiveQuestCount] = useState(0);

  useEffect(() => {
    const fetchActiveQuestCount = async () => {
      if (!address) {
        setActiveQuestCount(0);
        return;
      }

      try {
        // Fetch all quests from backend
        const allQuests = await questService.getAllQuests();
        
        // Filter by creator address and active status
        const activeQuests = allQuests.filter(
          (quest: any) =>
            quest.creatorAddress?.toLowerCase() === address.toLowerCase() &&
            (quest.status === 'ACTIVE' || quest.status === 'active')
        );

        // Also check localStorage for published quests
        let localActiveCount = 0;
        try {
          const storedQuests = localStorage.getItem('quests');
          if (storedQuests) {
            const parsedQuests = JSON.parse(storedQuests);
            const localActive = parsedQuests.filter(
              (q: any) =>
                q.creatorAddress?.toLowerCase() === address.toLowerCase() &&
                (q.status === 'ACTIVE' || q.status === 'active')
            );
            localActiveCount += localActive.length;
          }

          const publishedQuestsKey = `published_quests_${address.toLowerCase()}`;
          const storedPublishedQuests = localStorage.getItem(publishedQuestsKey);
          if (storedPublishedQuests) {
            const parsedPublishedQuests = JSON.parse(storedPublishedQuests);
            const localPublishedActive = parsedPublishedQuests.filter(
              (q: any) =>
                q.creatorAddress?.toLowerCase() === address.toLowerCase() &&
                (q.status === 'ACTIVE' || q.status === 'active')
            );
            localActiveCount += localPublishedActive.length;
          }
        } catch (error) {
          console.warn('Error reading active quests from localStorage:', error);
        }

        // Combine backend and localStorage, removing duplicates
        const allActiveQuests = [...activeQuests];
        const seenIds = new Set(activeQuests.map((q: any) => q.id));
        
        // Count unique active quests
        const uniqueActiveCount = allActiveQuests.length + localActiveCount;
        setActiveQuestCount(uniqueActiveCount);
      } catch (error) {
        console.error('Error fetching active quest count:', error);
        setActiveQuestCount(0);
      }
    };

    fetchActiveQuestCount();

    // Listen for quest publication events to update count in real-time
    const handleQuestPublished = () => {
      fetchActiveQuestCount();
    };

    window.addEventListener('questPublished', handleQuestPublished);

    return () => {
      window.removeEventListener('questPublished', handleQuestPublished);
    };
  }, [address, spaceId]);

  return activeQuestCount;
}

