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
        completed_by: [],
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
    if (updates.completedBy) updateData.completed_by = updates.completedBy;

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
    const { data: quest, error } = await supabase
      .from('published_quests')
      .select('completed_by')
      .eq('id', questId)
      .single();

    if (error) {
      console.error('Error fetching quest completions:', error);
      return [];
    }

    return quest?.completed_by || [];
  }

  async addQuestCompletion(questId: string, userAddress: string) {
    // Get current completions
    const { data: quest, error: fetchError } = await supabase
      .from('published_quests')
      .select('completed_by')
      .eq('id', questId)
      .single();

    if (fetchError) {
      console.error('Error fetching quest:', fetchError);
      throw new Error(fetchError.message);
    }

    const completedBy = quest?.completed_by || [];
    if (!completedBy.includes(userAddress.toLowerCase())) {
      completedBy.push(userAddress.toLowerCase());

      const { error: updateError } = await supabase
        .from('published_quests')
        .update({ completed_by: completedBy })
        .eq('id', questId);

      if (updateError) {
        console.error('Error updating completions:', updateError);
        throw new Error(updateError.message);
      }
    }

    return completedBy;
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
      completedBy: row.completed_by || [],
      winnerPrizes: row.winner_prizes || [],
      image: row.image,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
