import { supabase } from '../config/supabase.js';
import { QuestCreateInput } from '../types/index.js';
import { UserService } from './userService.js';

type QuestStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'EXPIRED';

export class QuestService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async getAllQuests(filters?: {
    status?: QuestStatus;
    projectId?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('quests')
      .select(`
        *,
        projects (*),
        quest_requirements (*),
        users!quests_creator_id_fkey (
          address,
          username
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    // Filter out expired quests
    const now = new Date().toISOString();
    query = query.or(`expires_at.is.null,expires_at.gt.${now}`);

    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data: quests, error } = await query;

    if (error) {
      console.error('Error fetching quests:', error);
      throw new Error(error.message);
    }

    // Get completion counts for each quest
    const questsWithCounts = await Promise.all(
      (quests || []).map(async (quest: any) => {
        const { count } = await supabase
          .from('quest_completions')
          .select('*', { count: 'exact', head: true })
          .eq('quest_id', quest.id);

        return {
          ...this.mapQuestFromDb(quest),
          completedCount: count || 0,
        };
      })
    );

    return questsWithCounts;
  }

  async getQuestById(questId: string) {
    const { data: quest, error } = await supabase
      .from('quests')
      .select(`
        *,
        projects (*),
        quest_requirements (*),
        users!quests_creator_id_fkey (
          address,
          username
        )
      `)
      .eq('id', questId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Quest not found');
      }
      console.error('Error fetching quest:', error);
      throw new Error(error.message);
    }

    // Get completion count
    const { count } = await supabase
      .from('quest_completions')
      .select('*', { count: 'exact', head: true })
      .eq('quest_id', questId);

    return {
      ...this.mapQuestFromDb(quest),
      completedCount: count || 0,
    };
  }

  async createQuest(creatorAddress: string, input: QuestCreateInput) {
    // Get or create user
    const user = await this.userService.getOrCreateUser(creatorAddress);

    // Get or create project
    const { data: existingProject } = await supabase
      .from('projects')
      .select('*')
      .eq('id', input.projectId)
      .maybeSingle();

    let project;
    if (!existingProject) {
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          id: input.projectId,
          name: input.projectName || input.projectId,
          owner: creatorAddress,
        })
        .select()
        .single();

      if (projectError) {
        console.error('Error creating project:', projectError);
        throw new Error(projectError.message);
      }
      project = newProject;
    } else {
      project = existingProject;
    }

    // Create quest
    const { data: quest, error: questError } = await supabase
      .from('quests')
      .insert({
        title: input.title,
        description: input.description,
        project_id: project.id,
        creator_id: user.id,
        xp_reward: input.xpReward,
        trust_reward: input.trustReward || null,
        status: 'ACTIVE',
        max_completions: input.maxCompletions || null,
        expires_at: input.expiresAt?.toISOString() || null,
        completed_count: 0,
      })
      .select()
      .single();

    if (questError) {
      console.error('Error creating quest:', questError);
      throw new Error(questError.message);
    }

    // Create requirements
    if (input.requirements && input.requirements.length > 0) {
      const requirementsData = input.requirements.map((req, index) => ({
        quest_id: quest.id,
        type: req.type,
        description: req.description,
        verification_data: req.verificationData,
        order: req.order ?? index,
      }));

      const { error: reqError } = await supabase
        .from('quest_requirements')
        .insert(requirementsData);

      if (reqError) {
        console.error('Error creating requirements:', reqError);
        // Continue even if requirements fail
      }
    }

    // Fetch full quest with relations
    return this.getQuestById(quest.id);
  }

  async updateQuest(questId: string, updates: Partial<QuestCreateInput>) {
    const updateData: any = {};

    if (updates.title) updateData.title = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.xpReward) updateData.xp_reward = updates.xpReward;
    if (updates.trustReward !== undefined) updateData.trust_reward = updates.trustReward;
    if (updates.maxCompletions !== undefined) updateData.max_completions = updates.maxCompletions;
    if (updates.expiresAt) updateData.expires_at = updates.expiresAt.toISOString();

    const { data: quest, error } = await supabase
      .from('quests')
      .update(updateData)
      .eq('id', questId)
      .select()
      .single();

    if (error) {
      console.error('Error updating quest:', error);
      throw new Error(error.message);
    }

    return this.getQuestById(questId);
  }

  async deleteQuest(questId: string) {
    const { error } = await supabase
      .from('quests')
      .delete()
      .eq('id', questId);

    if (error) {
      console.error('Error deleting quest:', error);
      throw new Error(error.message);
    }
  }

  async checkQuestCompletion(questId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('quest_completions')
      .select('id')
      .eq('quest_id', questId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking completion:', error);
      return false;
    }

    return !!data;
  }

  async canCompleteQuest(questId: string, userId: string): Promise<{ canComplete: boolean; reason?: string }> {
    const { data: quest, error } = await supabase
      .from('quests')
      .select('*')
      .eq('id', questId)
      .single();

    if (error || !quest) {
      return { canComplete: false, reason: 'Quest not found' };
    }

    if (quest.status !== 'ACTIVE') {
      return { canComplete: false, reason: 'Quest is not active' };
    }

    if (quest.expires_at && new Date(quest.expires_at) < new Date()) {
      return { canComplete: false, reason: 'Quest has expired' };
    }

    // Get completion count
    const { count } = await supabase
      .from('quest_completions')
      .select('*', { count: 'exact', head: true })
      .eq('quest_id', questId);

    if (quest.max_completions && (count || 0) >= quest.max_completions) {
      return { canComplete: false, reason: 'Quest has reached maximum completions' };
    }

    // Check if already completed
    const alreadyCompleted = await this.checkQuestCompletion(questId, userId);
    if (alreadyCompleted) {
      return { canComplete: false, reason: 'Quest already completed' };
    }

    return { canComplete: true };
  }

  /**
   * Map database row to Quest interface
   */
  private mapQuestFromDb(row: any) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      projectId: row.project_id,
      creatorId: row.creator_id,
      xpReward: row.xp_reward,
      trustReward: row.trust_reward ? parseFloat(row.trust_reward.toString()) : null,
      status: row.status,
      maxCompletions: row.max_completions,
      completedCount: row.completed_count || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      project: row.projects ? {
        id: row.projects.id,
        name: row.projects.name,
        description: row.projects.description,
        owner: row.projects.owner,
        imageUrl: row.projects.image_url,
      } : null,
      requirements: (row.quest_requirements || []).map((req: any) => ({
        id: req.id,
        questId: req.quest_id,
        type: req.type,
        description: req.description,
        verificationData: req.verification_data,
        order: req.order,
        createdAt: new Date(req.created_at),
      })),
      creator: row.users ? {
        address: row.users.address,
        username: row.users.username,
      } : null,
    };
  }
}
