import { apiClient } from './apiClient';
import type { Quest, QuestRequirement } from '../types';
import type { Address } from 'viem';
import { questServiceSupabase } from './questServiceSupabase';

/**
 * Backend-based Quest Service
 * This replaces the localStorage-based QuestService
 */
export class QuestServiceBackend {
  async getAllQuests(filters?: {
    status?: 'active' | 'completed' | 'pending';
    projectId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Quest[]> {
    try {
      // First, try to get quests from Supabase
      const supabaseQuests = await questServiceSupabase.getAllQuests(filters);
      
      // Also try to get from backend API
      let backendQuests: Quest[] = [];
      try {
        const quests = await apiClient.getQuests(filters);
        backendQuests = (quests || []).map((q: any) => this.transformQuest(q));
      } catch (error) {
        console.warn('Error fetching quests from backend API:', error);
      }
      
      // Also include published quests from localStorage (fallback)
      const allLocalQuests: Quest[] = [];
      try {
        const keys = Object.keys(localStorage);
        const publishedKeys = keys.filter(key => key.startsWith('published_quests_'));
        
        publishedKeys.forEach(key => {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsedQuests = JSON.parse(stored);
              parsedQuests.forEach((quest: any) => {
                if (quest.status === 'active' || !quest.status) {
                  const transformedQuest: Quest = {
                    id: quest.id,
                    title: quest.title,
                    description: quest.description || '',
                    projectId: quest.projectId,
                    projectName: quest.projectName || quest.projectId,
                    xpReward: quest.xpReward || quest.iqPoints || 100,
                    iqPoints: quest.iqPoints ?? quest.xpReward ?? 100, // Prioritize iqPoints, use nullish coalescing
                    requirements: quest.requirements || [],
                    status: (quest.status || 'active') as Quest['status'],
                    createdAt: quest.createdAt || Date.now(),
                    completedBy: quest.completedBy || [],
                    creatorType: 'community',
                    creatorAddress: quest.creatorAddress,
                    twitterLink: quest.twitterLink,
                    difficulty: quest.difficulty,
                    estimatedTime: quest.estimatedTime,
                    image: quest.image,
                    distributionType: quest.distributionType,
                    numberOfWinners: quest.numberOfWinners,
                    winnerPrizes: quest.winnerPrizes,
                    rewardDeposit: quest.rewardDeposit,
                    rewardToken: quest.rewardToken,
                  };
                  allLocalQuests.push(transformedQuest);
                }
              });
            }
          } catch (error) {
            console.warn('Error parsing localStorage quests:', error);
          }
        });
      } catch (error) {
        console.warn('Error reading localStorage quests:', error);
      }
      
      // Combine all sources, removing duplicates (Supabase takes priority)
      const allQuests = [...supabaseQuests];
      const seenIds = new Set(supabaseQuests.map(q => q.id));
      
      // Add backend quests
      backendQuests.forEach(quest => {
        if (!seenIds.has(quest.id)) {
          allQuests.push(quest);
          seenIds.add(quest.id);
        }
      });
      
      // Add localStorage quests
      allLocalQuests.forEach(localQuest => {
        if (!seenIds.has(localQuest.id)) {
          allQuests.push(localQuest);
          seenIds.add(localQuest.id);
        }
      });
      
      // Apply filters
      let filteredQuests = allQuests;
      if (filters?.status) {
        filteredQuests = filteredQuests.filter(q => q.status === filters.status);
      }
      if (filters?.projectId) {
        filteredQuests = filteredQuests.filter(q => q.projectId === filters.projectId);
      }
      
      return filteredQuests;
    } catch (error) {
      console.error('Error fetching quests:', error);
      return [];
    }
  }

  async getQuestById(questId: string): Promise<Quest | null> {
    try {
      const quest = await apiClient.getQuestById(questId);
      return this.transformQuest(quest);
    } catch (error) {
      console.error('Error fetching quest:', error);
      return null;
    }
  }

  async createQuest(
    projectId: string,
    projectName: string,
    title: string,
    description: string,
    xpReward: number,
    requirements: QuestRequirement[],
    trustReward?: number,
    maxCompletions?: number,
    expiresAt?: Date,
    twitterLink?: string // Creator's X profile URL
  ): Promise<Quest> {
    const quest = await apiClient.createQuest({
      title,
      description,
      projectId,
      projectName,
      xpReward,
      trustReward,
      requirements: requirements.map(req => ({
        type: req.type,
        description: req.description,
        verificationData: { verification: req.verification },
        order: 0,
      })),
      maxCompletions,
      expiresAt,
      twitterLink, // Include creator's X profile URL
    });

    return this.transformQuest(quest);
  }

  async completeQuest(
    questId: string,
    userAddress: Address,
    verificationData?: Record<string, any>
  ): Promise<{ xp: number; claimId?: string }> {
    const completion = await apiClient.completeQuest(questId, verificationData);
    
    return {
      xp: completion.xpEarned,
      claimId: completion.claimId || undefined,
    };
  }

  async getUserXP(userAddress: Address): Promise<{
    address: string;
    totalXP: number;
    questsCompleted: number;
    claims: any[];
    rank?: number;
  } | null> {
    try {
      const xpData = await apiClient.getUserXP(userAddress);
      const rank = await apiClient.getUserRank(userAddress);

      return {
        address: userAddress,
        totalXP: xpData.totalXP || 0,
        questsCompleted: xpData.questsCompleted || 0,
        claims: [], // TODO: Fetch claims from backend
        rank: rank || undefined,
      };
    } catch (error) {
      console.error('Error fetching user XP:', error);
      return null;
    }
  }

  /**
   * Transform backend quest format to frontend format
   */
  private transformQuest(backendQuest: any): Quest {
    // Get creator's X profile URL from their social connections if available
    let twitterLink: string | undefined;
    if (backendQuest.creator?.address) {
      try {
        const stored = localStorage.getItem(`social_connections_${backendQuest.creator.address.toLowerCase()}`);
        if (stored) {
          const connections = JSON.parse(stored);
          if (connections.twitter?.profileUrl) {
            twitterLink = connections.twitter.profileUrl;
          }
        }
      } catch (error) {
        // Ignore errors when reading from localStorage
      }
    }

    return {
      id: backendQuest.id,
      title: backendQuest.title,
      description: backendQuest.description,
      projectId: backendQuest.projectId,
      projectName: backendQuest.project?.name || backendQuest.projectId,
      xpReward: backendQuest.xpReward,
      iqPoints: backendQuest.iqPoints || backendQuest.iq_points || backendQuest.xpReward, // Include iqPoints from backend
      intuitionClaimId: backendQuest.trustReward ? 'trust-reward' : undefined,
      requirements: (backendQuest.requirements || []).map((req: any) => ({
        type: req.type.toLowerCase() as QuestRequirement['type'],
        description: req.description,
        verification: JSON.stringify(req.verificationData),
        verified: false,
      })),
      status: backendQuest.status.toLowerCase() as Quest['status'],
      createdAt: new Date(backendQuest.createdAt).getTime(),
      completedBy: backendQuest.completedCount > 0 ? ['completed'] : [],
      creatorType: backendQuest.creatorType || 'community',
      creatorAddress: backendQuest.creator?.address,
      twitterLink: twitterLink || backendQuest.twitterLink, // Use from quest data or creator's connections
    };
  }
}

// Export singleton instance
export const questServiceBackend = new QuestServiceBackend();
