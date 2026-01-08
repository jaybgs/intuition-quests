import { supabase } from '../config/supabase.js';
import { QuestService } from './questService.js';
import { XPService } from './xpService.js';
import { UserService } from './userService.js';

export class CompletionService {
  private questService: QuestService;
  private xpService: XPService;
  private userService: UserService;

  constructor() {
    this.questService = new QuestService();
    this.xpService = new XPService();
    this.userService = new UserService();
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

    // Get or create user
    const user = await this.userService.getOrCreateUser(userAddress);
    
    // Add completion to quest
    await this.questService.addQuestCompletion(questId, userAddress);

    // Update user XP
    await this.xpService.addXP(user.id, quest.xpReward || quest.iqPoints || 100);

    return {
      questId,
      userAddress,
      completedAt: new Date().toISOString(),
      xpEarned: quest.xpReward || quest.iqPoints || 100,
      claimId: undefined, // TODO: Add trust contract integration
    };
  }

  async getUserCompletions(userAddress: string, limit = 50) {
    // Get quest IDs completed by user from user_quests table
    const { data: userQuests, error: userQuestsError } = await supabase
      .from('user_quests')
      .select('quest_id, completed_at')
      .eq('wallet_address', userAddress.toLowerCase())
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (userQuestsError) {
      console.error('Error fetching user quest completions:', userQuestsError);
      return [];
    }

    if (!userQuests || userQuests.length === 0) {
      return [];
    }

    // Get the actual quest data for completed quests
    const questIds = userQuests.map(uq => uq.quest_id);
    const { data: quests, error: questsError } = await supabase
      .from('published_quests')
      .select('*')
      .in('id', questIds);

    if (questsError) {
      console.error('Error fetching completed quests:', questsError);
      return [];
    }

    // Map to the expected format with completion timestamps
    return (quests || []).map((quest: any) => {
      const userQuest = userQuests.find(uq => uq.quest_id === quest.id);
      return {
        questId: quest.id,
        questTitle: quest.title,
        xpEarned: quest.xp_reward,
        completedAt: userQuest?.completed_at || quest.updated_at,
      };
    });
  }

  async getQuestCompletions(questId: string, limit = 100) {
    try {
      const quest = await this.questService.getQuestById(questId);
      if (!quest) {
        console.log(`Quest ${questId} not found, returning empty completions`);
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
      // Return empty array instead of throwing to prevent 500 errors
      return [];
    }
  }
}

export const completionService = new CompletionService();
