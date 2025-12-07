import type { Quest, QuestRequirement } from '../types';
import { supabase } from '../config/supabase';

/**
 * Quest Service using Supabase
 * This stores and retrieves quests from Supabase database
 */
export class QuestServiceSupabase {
  /**
   * Get all published quests
   */
  async getAllQuests(filters?: {
    status?: 'active' | 'completed' | 'pending';
    projectId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Quest[]> {
    if (!supabase) {
      return this.fallbackGetAllQuests(filters);
    }

    try {
      let query = supabase
        .from('published_quests')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status.toUpperCase());
      }

      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching quests from Supabase:', error);
        return this.fallbackGetAllQuests(filters);
      }

      return (data || []).map(quest => this.mapQuestFromDb(quest));
    } catch (error) {
      console.error('Error fetching quests:', error);
      return this.fallbackGetAllQuests(filters);
    }
  }

  /**
   * Get a quest by ID
   */
  async getQuestById(questId: string): Promise<Quest | null> {
    if (!supabase) {
      return this.fallbackGetQuestById(questId);
    }

    try {
      const { data, error } = await supabase
        .from('published_quests')
        .select('*')
        .eq('id', questId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return this.fallbackGetQuestById(questId);
        }
        console.error('Error fetching quest:', error);
        return this.fallbackGetQuestById(questId);
      }

      return data ? this.mapQuestFromDb(data) : null;
    } catch (error) {
      console.error('Error fetching quest:', error);
      return this.fallbackGetQuestById(questId);
    }
  }

  /**
   * Publish a quest to Supabase
   */
  async publishQuest(quest: Quest): Promise<Quest> {
    if (!supabase) {
      return this.fallbackPublishQuest(quest);
    }

    try {
      const questData = {
        id: quest.id,
        title: quest.title,
        description: quest.description,
        project_id: quest.projectId,
        project_name: quest.projectName,
        creator_address: quest.creatorAddress || null,
        space_id: quest.spaceId || null,
        xp_reward: quest.xpReward || quest.iqPoints || 100,
        iq_points: quest.iqPoints || quest.xpReward || 100,
        status: (quest.status || 'active').toUpperCase(),
        twitter_link: quest.twitterLink || null,
        atom_id: quest.atomId || null,
        atom_transaction_hash: quest.atomTransactionHash || null,
        distribution_type: quest.distributionType || null,
        number_of_winners: quest.numberOfWinners || null,
        reward_deposit: quest.rewardDeposit || null,
        reward_token: quest.rewardToken || null,
        difficulty: quest.difficulty || null,
        estimated_time: quest.estimatedTime || null,
        expires_at: quest.expiresAt ? new Date(quest.expiresAt).toISOString() : null,
        requirements: JSON.stringify(quest.requirements || []),
        completed_by: JSON.stringify(quest.completedBy || []),
        winner_prizes: JSON.stringify(quest.winnerPrizes || []),
        image: quest.image || null,
      };

      const { data, error } = await supabase
        .from('published_quests')
        .insert(questData)
        .select()
        .single();

      if (error) {
        console.error('Error publishing quest to Supabase:', error);
        return this.fallbackPublishQuest(quest);
      }

      return this.mapQuestFromDb(data);
    } catch (error) {
      console.error('Error publishing quest:', error);
      return this.fallbackPublishQuest(quest);
    }
  }

  /**
   * Update a quest
   */
  async updateQuest(questId: string, updates: Partial<Quest>): Promise<Quest | null> {
    if (!supabase) {
      return this.fallbackUpdateQuest(questId, updates);
    }

    try {
      const updateData: any = {};

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.status !== undefined) updateData.status = updates.status.toUpperCase();
      if (updates.xpReward !== undefined) updateData.xp_reward = updates.xpReward;
      if (updates.iqPoints !== undefined) updateData.iq_points = updates.iqPoints;
      if (updates.completedBy !== undefined) updateData.completed_by = JSON.stringify(updates.completedBy);
      if (updates.requirements !== undefined) updateData.requirements = JSON.stringify(updates.requirements);

      const { data, error } = await supabase
        .from('published_quests')
        .update(updateData)
        .eq('id', questId)
        .select()
        .single();

      if (error) {
        console.error('Error updating quest in Supabase:', error);
        return this.fallbackUpdateQuest(questId, updates);
      }

      return data ? this.mapQuestFromDb(data) : null;
    } catch (error) {
      console.error('Error updating quest:', error);
      return this.fallbackUpdateQuest(questId, updates);
    }
  }

  /**
   * Map database row to Quest interface
   */
  private mapQuestFromDb(row: any): Quest {
    let requirements: QuestRequirement[] = [];
    try {
      if (typeof row.requirements === 'string') {
        requirements = JSON.parse(row.requirements);
      } else if (Array.isArray(row.requirements)) {
        requirements = row.requirements;
      }
    } catch (error) {
      console.warn('Error parsing quest requirements:', error);
    }

    let completedBy: string[] = [];
    try {
      if (typeof row.completed_by === 'string') {
        completedBy = JSON.parse(row.completed_by);
      } else if (Array.isArray(row.completed_by)) {
        completedBy = row.completed_by;
      }
    } catch (error) {
      console.warn('Error parsing completed_by:', error);
    }

    let winnerPrizes: string[] = [];
    try {
      if (typeof row.winner_prizes === 'string') {
        winnerPrizes = JSON.parse(row.winner_prizes);
      } else if (Array.isArray(row.winner_prizes)) {
        winnerPrizes = row.winner_prizes;
      }
    } catch (error) {
      console.warn('Error parsing winner_prizes:', error);
    }

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      projectId: row.project_id,
      projectName: row.project_name,
      spaceId: row.space_id || undefined,
      xpReward: row.xp_reward || row.iq_points || 100,
      iqPoints: row.iq_points ?? row.xp_reward ?? 100, // Prioritize iq_points, use nullish coalescing
      requirements,
      status: (row.status || 'ACTIVE').toLowerCase() as Quest['status'],
      createdAt: new Date(row.created_at).getTime(),
      completedBy,
      creatorType: row.creator_address ? 'community' : 'project',
      creatorAddress: row.creator_address,
      twitterLink: row.twitter_link,
      atomId: row.atom_id,
      atomTransactionHash: row.atom_transaction_hash,
      distributionType: row.distribution_type,
      numberOfWinners: row.number_of_winners,
      rewardDeposit: row.reward_deposit,
      rewardToken: row.reward_token,
      difficulty: row.difficulty,
      estimatedTime: row.estimated_time,
      expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
      winnerPrizes,
      image: row.image,
    };
  }

  // Fallback methods to localStorage
  private fallbackGetAllQuests(filters?: any): Quest[] {
    const allQuests: Quest[] = [];
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
                allQuests.push(this.mapLocalQuest(quest));
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

    let filtered = allQuests;
    if (filters?.status) {
      filtered = filtered.filter(q => q.status === filters.status);
    }
    if (filters?.projectId) {
      filtered = filtered.filter(q => q.projectId === filters.projectId);
    }

    return filtered;
  }

  private fallbackGetQuestById(questId: string): Quest | null {
    try {
      const keys = Object.keys(localStorage);
      const publishedKeys = keys.filter(key => key.startsWith('published_quests_'));

      for (const key of publishedKeys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsedQuests = JSON.parse(stored);
          const quest = parsedQuests.find((q: any) => q.id === questId);
          if (quest) {
            return this.mapLocalQuest(quest);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching quest from localStorage:', error);
    }
    return null;
  }

  private fallbackPublishQuest(quest: Quest): Quest {
    // Store in localStorage as fallback
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const key = `published_quests_${quest.creatorAddress?.toLowerCase() || 'unknown'}`;
        const stored = localStorage.getItem(key);
        const quests = stored ? JSON.parse(stored) : [];
        
        const existingIndex = quests.findIndex((q: any) => q.id === quest.id);
        if (existingIndex >= 0) {
          quests[existingIndex] = quest;
        } else {
          quests.push(quest);
        }
        
        localStorage.setItem(key, JSON.stringify(quests));
      } catch (error) {
        console.error('Error saving quest to localStorage:', error);
      }
    }
    return quest;
  }

  private fallbackUpdateQuest(questId: string, updates: Partial<Quest>): Quest | null {
    try {
      const keys = Object.keys(localStorage);
      const publishedKeys = keys.filter(key => key.startsWith('published_quests_'));

      for (const key of publishedKeys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const quests = JSON.parse(stored);
          const index = quests.findIndex((q: any) => q.id === questId);
          if (index >= 0) {
            quests[index] = { ...quests[index], ...updates };
            localStorage.setItem(key, JSON.stringify(quests));
            return this.mapLocalQuest(quests[index]);
          }
        }
      }
    } catch (error) {
      console.error('Error updating quest in localStorage:', error);
    }
    return null;
  }

  private mapLocalQuest(quest: any): Quest {
    return {
      id: quest.id,
      title: quest.title,
      description: quest.description || '',
      projectId: quest.projectId,
      projectName: quest.projectName || quest.projectId,
      spaceId: quest.spaceId || undefined,
      xpReward: quest.xpReward || quest.iqPoints || 100,
      iqPoints: quest.iqPoints || quest.xpReward || 100,
      requirements: quest.requirements || [],
      status: (quest.status || 'active') as Quest['status'],
      createdAt: quest.createdAt || Date.now(),
      completedBy: quest.completedBy || [],
      creatorType: quest.creatorType || 'community',
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
  }
}

// Export singleton instance
export const questServiceSupabase = new QuestServiceSupabase();
