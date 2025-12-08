import { supabase } from '../config/supabase.js';
import { QuestService } from './questService.js';

export class CompletionService {
  private questService: QuestService;

  constructor() {
    this.questService = new QuestService();
  }

  async completeQuest(questId: string, userAddress: string) {
    // Get quest
    const quest = await this.questService.getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    // Check if already completed
    const completedBy = quest.completedBy || [];
    if (completedBy.includes(userAddress.toLowerCase())) {
      throw new Error('Quest already completed by this user');
    }

    // Add completion
    await this.questService.addQuestCompletion(questId, userAddress);

    return {
      questId,
      userAddress,
      completedAt: new Date().toISOString(),
      xpEarned: quest.xpReward,
    };
  }

  async getUserCompletions(userAddress: string, limit = 50) {
    // Get all quests and filter by those completed by user
    const { data: quests, error } = await supabase
      .from('published_quests')
      .select('*')
      .contains('completed_by', [userAddress.toLowerCase()])
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user completions:', error);
      return [];
    }

    return (quests || []).map((quest: any) => ({
      questId: quest.id,
      questTitle: quest.title,
      xpEarned: quest.xp_reward,
      completedAt: quest.updated_at,
    }));
  }

  async getQuestCompletions(questId: string, limit = 100) {
    try {
      const quest = await this.questService.getQuestById(questId);
      if (!quest) {
        return [];
      }

      const completedBy = quest.completedBy || [];
      return completedBy.slice(0, limit).map((address: string) => ({
        userAddress: address,
        questId,
        completedAt: null, // We don't track individual completion times in this model
      }));
    } catch (error) {
      console.error('Error fetching quest completions:', error);
      return [];
    }
  }
}
