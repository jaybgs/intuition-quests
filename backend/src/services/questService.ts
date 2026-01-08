import { supabase } from '../config/supabase.js';

export class QuestService {
  async getAllQuests(filters?: {
    status?: string;
    projectId?: string;
    spaceId?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('published_quests')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    if (filters?.spaceId) {
      query = query.eq('space_id', filters.spaceId);
    }

    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data: quests, error } = await query;

    if (error) {
      console.error('Error fetching quests:', error);
      throw new Error(error.message);
    }

    return (quests || []).map(this.mapQuestFromDb);
  }

  async getQuestById(questId: string) {
    const { data: quest, error } = await supabase
      .from('published_quests')
      .select('*')
      .eq('id', questId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Quest not found');
      }
      console.error('Error fetching quest:', error);
      throw new Error(error.message);
    }

    return this.mapQuestFromDb(quest);
  }

  async createQuest(creatorAddress: string, input: any) {
    const questId = `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: quest, error } = await supabase
      .from('published_quests')
      .insert({
        id: questId,
        title: input.title,
        description: input.description,
        project_id: input.projectId,
        project_name: input.projectName || input.projectId,
        space_id: input.spaceId || null,
        creator_address: creatorAddress,
        xp_reward: input.xpReward || 100,
        iq_points: input.iqPoints || 100,
        status: 'active',
        twitter_link: input.twitterLink || null,
        atom_id: input.atomId || null,
        atom_transaction_hash: input.atomTransactionHash || null,
        distribution_type: input.distributionType || null,
        number_of_winners: input.numberOfWinners || null,
        reward_deposit: input.rewardDeposit || null,
        reward_token: input.rewardToken || null,
        difficulty: input.difficulty || null,
        estimated_time: input.estimatedTime || null,
        expires_at: input.expiresAt || null,
        requirements: input.requirements || [],
        image: input.image || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quest:', error);
      throw new Error(error.message);
    }

    return this.mapQuestFromDb(quest);
  }

  async updateQuest(questId: string, updates: any) {
    const updateData: any = {};

    if (updates.title) updateData.title = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.xpReward) updateData.xp_reward = updates.xpReward;
    if (updates.status) updateData.status = updates.status;
    if (updates.requirements) updateData.requirements = updates.requirements;

    const { data: quest, error } = await supabase
      .from('published_quests')
      .update(updateData)
      .eq('id', questId)
      .select()
      .single();

    if (error) {
      console.error('Error updating quest:', error);
      throw new Error(error.message);
    }

    return this.mapQuestFromDb(quest);
  }

  async deleteQuest(questId: string) {
    const { error } = await supabase
      .from('published_quests')
      .delete()
      .eq('id', questId);

    if (error) {
      console.error('Error deleting quest:', error);
      throw new Error(error.message);
    }
  }

  async getQuestCompletions(questId: string) {
    const { data: completions, error } = await supabase
      .from('user_quests')
      .select('wallet_address, completed_at')
      .eq('quest_id', questId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching quest completions:', error);
      return [];
    }

    return completions?.map(c => c.wallet_address) || [];
  }

  async deleteQuestsBySpaceId(spaceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('published_quests')
        .delete()
        .eq('space_id', spaceId);

      if (error) {
        console.error('Error deleting quests by space_id:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting quests by space_id:', error);
      return false;
    }
  }

  async addQuestCompletion(questId: string, userAddress: string) {
    // Check if completion already exists
    const { data: existing, error: checkError } = await supabase
      .from('user_quests')
      .select('quest_id')
      .eq('wallet_address', userAddress.toLowerCase())
      .eq('quest_id', questId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing completion:', checkError);
      throw new Error(checkError.message);
    }

    if (existing) {
      // Already completed
      return [userAddress.toLowerCase()];
    }

    // Add new completion
    const { error: insertError } = await supabase
      .from('user_quests')
      .insert({
        wallet_address: userAddress.toLowerCase(),
        quest_id: questId,
        completed_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error adding quest completion:', insertError);
      throw new Error(insertError.message);
    }

    return [userAddress.toLowerCase()];
  }

  private mapQuestFromDb(row: any) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      projectId: row.project_id,
      projectName: row.project_name,
      spaceId: row.space_id,
      creatorAddress: row.creator_address,
      xpReward: row.xp_reward,
      iqPoints: row.iq_points,
      status: row.status,
      twitterLink: row.twitter_link,
      atomId: row.atom_id,
      atomTransactionHash: row.atom_transaction_hash,
      distributionType: row.distribution_type,
      numberOfWinners: row.number_of_winners,
      rewardDeposit: row.reward_deposit,
      rewardToken: row.reward_token,
      difficulty: row.difficulty,
      estimatedTime: row.estimated_time,
      expiresAt: row.expires_at,
      requirements: row.requirements || [],
      winnerPrizes: row.winner_prizes || [],
      image: row.image,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
