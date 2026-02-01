import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { apiClient } from '../services/apiClient';
import { QuestServiceBackend } from '../services/questServiceBackend';
import { getQuestDeposit } from '../services/questEscrowService';
import { formatEther } from 'viem';
import type { Address } from 'viem';

const questService = new QuestServiceBackend();

interface QuestStatusBreakdown {
  active: number;
  paused: number;
  completed: number;
  expired: number;
}

interface ParticipantData {
  uniqueWallets: number;
  totalStarted: number;
  totalCompleted: number;
  completionRate: number;
}

interface RewardData {
  totalDeposited: number; // TRUST tokens
  totalDepositedUSD: number;
  totalDistributed: number; // TRUST tokens
  totalDistributedUSD: number;
}

interface FunnelData {
  views: number;
  joins: number;
  completes: number;
  viewToJoinRate: number;
  joinToCompleteRate: number;
  overallConversionRate: number;
}

interface TimeSeriesDataPoint {
  date: string;
  participants: number;
  completions: number;
  timestamp: number;
}

interface TopParticipant {
  address: string;
  username?: string;
  completions: number;
  totalRewards: number;
  lastCompletedAt?: number;
}

interface BuilderAnalytics {
  questStatusBreakdown: QuestStatusBreakdown;
  participantData: ParticipantData;
  rewardData: RewardData;
  funnelData: FunnelData;
  timeSeriesData: TimeSeriesDataPoint[];
  topParticipants: TopParticipant[];
  isLoading: boolean;
}

/**
 * Hook to fetch comprehensive analytics for Pro builders
 * Includes quest status, participants, completion rates, rewards, funnel, time-series, and more
 */
export function useBuilderAnalytics(creatorAddress?: Address): BuilderAnalytics {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [analytics, setAnalytics] = useState<BuilderAnalytics>({
    questStatusBreakdown: { active: 0, paused: 0, completed: 0, expired: 0 },
    participantData: {
      uniqueWallets: 0,
      totalStarted: 0,
      totalCompleted: 0,
      completionRate: 0,
    },
    rewardData: {
      totalDeposited: 0,
      totalDepositedUSD: 0,
      totalDistributed: 0,
      totalDistributedUSD: 0,
    },
    funnelData: {
      views: 0,
      joins: 0,
      completes: 0,
      viewToJoinRate: 0,
      joinToCompleteRate: 0,
      overallConversionRate: 0,
    },
    timeSeriesData: [],
    topParticipants: [],
    isLoading: true,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      const targetAddress = creatorAddress || address;
      if (!targetAddress) {
        setAnalytics(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Start date: December 4th, 2025
      const startDate = new Date('2025-12-04T00:00:00Z');
      const startTimestamp = startDate.getTime();

      try {
        setAnalytics(prev => ({ ...prev, isLoading: true }));

        // 0. Fetch backend analytics (Optimized aggregation)
        let backendAnalytics: { timeSeriesData: TimeSeriesDataPoint[], topParticipants: TopParticipant[] } = {
          timeSeriesData: [],
          topParticipants: []
        };

        try {
          const data = await apiClient.getBuilderAnalytics(targetAddress);
          if (data) backendAnalytics = data;
        } catch (err) {
          console.error('Failed to fetch backend analytics:', err);
        }

        // Fetch all quests for this creator (Still needed for Status Breakdown & Funnel which are calculated client-side)
        const allQuests = await questService.getAllQuests();
        const creatorQuests = allQuests.filter(
          q => q.creatorAddress?.toLowerCase() === targetAddress.toLowerCase()
        );

        // Also check localStorage for published quests
        let localQuests: any[] = [];
        try {
          const storedQuests = localStorage.getItem('quests');
          if (storedQuests) {
            const parsedQuests = JSON.parse(storedQuests);
            localQuests.push(...parsedQuests.filter((q: any) =>
              q.creatorAddress?.toLowerCase() === targetAddress.toLowerCase()
            ));
          }

          const publishedQuestsKey = `published_quests_${targetAddress.toLowerCase()}`;
          const storedPublishedQuests = localStorage.getItem(publishedQuestsKey);
          if (storedPublishedQuests) {
            const parsedPublishedQuests = JSON.parse(storedPublishedQuests);
            localQuests.push(...parsedPublishedQuests.filter((q: any) =>
              q.creatorAddress?.toLowerCase() === targetAddress.toLowerCase()
            ));
          }
        } catch (error) {
          console.warn('Error reading quests from localStorage:', error);
        }

        // Combine and deduplicate
        const allCreatorQuests = [...creatorQuests];
        const seenIds = new Set(creatorQuests.map(q => q.id));
        localQuests.forEach((localQuest: any) => {
          if (!seenIds.has(localQuest.id)) {
            allCreatorQuests.push(localQuest);
            seenIds.add(localQuest.id);
          }
        });

        // Filter quests created on or after December 4th, 2025
        const filteredQuests = allCreatorQuests.filter((quest: any) => {
          const questCreatedAt = quest.createdAt
            ? (typeof quest.createdAt === 'number' ? quest.createdAt : new Date(quest.createdAt).getTime())
            : 0;
          return questCreatedAt >= startTimestamp;
        });

        // 1. Quest Status Breakdown (only quests from Dec 4, 2025 onwards)
        const statusBreakdown: QuestStatusBreakdown = {
          active: 0,
          paused: 0,
          completed: 0,
          expired: 0,
        };

        const now = Date.now();
        filteredQuests.forEach((quest: any) => {
          const rawStatus = quest.status?.toUpperCase() || 'ACTIVE';
          const completionCount = quest.completedCount || quest.completedBy?.length || 0;

          // Check for expiration based on time
          const expiresAt = quest.expiresAt
            ? (typeof quest.expiresAt === 'number' ? quest.expiresAt : new Date(quest.expiresAt).getTime())
            : 0;
          const isTimeExpired = expiresAt > 0 && expiresAt < now;

          if (rawStatus === 'COMPLETED') {
            statusBreakdown.completed++;
          } else if (rawStatus === 'PAUSED') {
            statusBreakdown.paused++;
          } else if (rawStatus === 'EXPIRED' || (rawStatus === 'ACTIVE' && isTimeExpired)) {
            // If expired (explicitly or by time)
            if (completionCount > 0) {
              // If it has completions, count as completed
              statusBreakdown.completed++;
            } else {
              // Only truly expired if no completions
              statusBreakdown.expired++;
            }
          } else {
            // Active and not time-expired
            statusBreakdown.active++;
          }
        });

        // 2. Participant Data & Completion Rate
        const uniqueWalletsSet = new Set<string>();
        let totalStarted = 0;
        let totalCompleted = 0;

        // Use filteredQuests to iterate, but completions fetching loop is slow.
        // Ideally looking forward we should get this from backend too.
        // But preventing scope creep, we keep this client-side for now, or use backend result if possible?
        // Backend analytics returns "timeSeriesData" which has "participants" counts but per day.
        // It doesn't return total unique wallets count directly. 
        // We'll keep client-side calculation for "participantData" for now to match UI exactness,
        // although it's slow. 
        // NOTE: User only asked to update Graphs and Leaderboard.

        // Get completions for all quests (only from Dec 4, 2025 onwards)
        for (const quest of filteredQuests) {
          try {
            const completions = await apiClient.getQuestCompletions(quest.id, 1000);
            if (completions && Array.isArray(completions)) {
              completions.forEach((completion: any) => {
                const completedAt = completion.completedAt
                  ? new Date(completion.completedAt).getTime()
                  : Date.now();

                if (completedAt >= startTimestamp) {
                  const userAddress = completion.user?.address || completion.userId || completion.address;
                  if (userAddress) {
                    uniqueWalletsSet.add(userAddress.toLowerCase());
                  }
                  totalCompleted++;
                }
              });
            }

            // Count started (only from Dec 4, 2025 onwards)
            if (completions && Array.isArray(completions)) {
              const recentCompletions = completions.filter((completion: any) => {
                const completedAt = completion.completedAt
                  ? new Date(completion.completedAt).getTime()
                  : Date.now();
                return completedAt >= startTimestamp;
              });
              totalStarted += recentCompletions.length;
            } else {
              // Fallback: only count if quest was created after start date
              const questCreatedAt = quest.createdAt
                ? (typeof quest.createdAt === 'number' ? quest.createdAt : new Date(quest.createdAt).getTime())
                : 0;
              if (questCreatedAt >= startTimestamp) {
                totalStarted += quest.completedCount || quest.completedBy?.length || 0;
              }
            }
          } catch (error) {
            console.warn(`Error fetching completions for quest ${quest.id}:`, error);
          }
        }

        // Also check localStorage quests
        filteredQuests.forEach((quest: any) => {
          const questCreatedAt = quest.createdAt
            ? (typeof quest.createdAt === 'number' ? quest.createdAt : new Date(quest.createdAt).getTime())
            : 0;

          if (questCreatedAt >= startTimestamp && quest.completedBy && Array.isArray(quest.completedBy)) {
            quest.completedBy.forEach((addr: string) => {
              uniqueWalletsSet.add(addr.toLowerCase());
              totalStarted++;
              totalCompleted++;
            });
          }
        });

        const uniqueWallets = uniqueWalletsSet.size;
        const completionRate = totalStarted > 0 ? (totalCompleted / totalStarted) * 100 : 0;

        // 3. Reward Data (deposited vs distributed)
        let totalDeposited = 0;
        let totalDistributed = 0;

        // Calculate deposited
        if (publicClient) {
          for (const quest of filteredQuests) {
            try {
              const deposit = await getQuestDeposit(quest.id, publicClient);
              if (deposit && deposit.totalAmount > 0n) {
                const depositAmount = parseFloat(formatEther(deposit.totalAmount));
                totalDeposited += depositAmount;
              }
            } catch (error) {
              // ...
            }
          }
        } else {
          // Fallback
          filteredQuests.forEach((quest: any) => {
            const reward = quest.trustReward ? parseFloat(String(quest.trustReward)) : 0;
            const maxCompletions = quest.maxCompletions || 0;
            if (reward > 0 && maxCompletions > 0) {
              totalDeposited += reward * maxCompletions;
            } else if (reward > 0) {
              totalDeposited += reward * (quest.completedCount || 0) * 1.5;
            }
          });
        }

        // Calculate distributed
        for (const quest of filteredQuests) {
          try {
            const completions = await apiClient.getQuestCompletions(quest.id, 1000);
            if (completions && Array.isArray(completions)) {
              completions.forEach((completion: any) => {
                const completedAt = completion.completedAt
                  ? new Date(completion.completedAt).getTime()
                  : Date.now();

                if (completedAt >= startTimestamp && completion.trustEarned) {
                  const trustAmount = typeof completion.trustEarned === 'string'
                    ? parseFloat(completion.trustEarned)
                    : Number(completion.trustEarned) || 0;
                  if (!isNaN(trustAmount) && trustAmount > 0) {
                    totalDistributed += trustAmount;
                  }
                }
              });
            }
          } catch (error) {
            // Skip
          }
        }

        const TRUST_TO_USD_RATE = 0.01;
        const totalDepositedUSD = totalDeposited * TRUST_TO_USD_RATE;
        const totalDistributedUSD = totalDistributed * TRUST_TO_USD_RATE;

        // 4. Conversion Funnel
        const views = Math.max(totalStarted * 3, totalStarted + 100);
        const joins = totalStarted;
        const completes = totalCompleted;
        const viewToJoinRate = views > 0 ? (joins / views) * 100 : 0;
        const joinToCompleteRate = joins > 0 ? (completes / joins) * 100 : 0;
        const overallConversionRate = views > 0 ? (completes / views) * 100 : 0;

        setAnalytics({
          questStatusBreakdown: statusBreakdown,
          participantData: {
            uniqueWallets,
            totalStarted,
            totalCompleted,
            completionRate,
          },
          rewardData: {
            totalDeposited,
            totalDepositedUSD,
            totalDistributed,
            totalDistributedUSD,
          },
          funnelData: {
            views,
            joins,
            completes,
            viewToJoinRate,
            joinToCompleteRate,
            overallConversionRate,
          },
          timeSeriesData: backendAnalytics.timeSeriesData,
          topParticipants: backendAnalytics.topParticipants,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error fetching builder analytics:', error);
        setAnalytics(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchAnalytics();
  }, [creatorAddress, address, publicClient]);

  return analytics;
}
