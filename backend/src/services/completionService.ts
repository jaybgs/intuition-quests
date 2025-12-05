import { supabase } from '../config/supabase';
import { QuestCompletionInput } from '../types';
import { QuestService } from './questService';
import { VerificationService } from './verificationService';
import { XPService } from './xpService';
import { BlockchainService } from './blockchainService';
import { UserService } from './userService';

export class CompletionService {
  private questService: QuestService;
  private verificationService: VerificationService;
  private xpService: XPService;
  private blockchainService: BlockchainService;
  private userService: UserService;

  constructor() {
    this.questService = new QuestService();
    this.verificationService = new VerificationService();
    this.xpService = new XPService();
    this.blockchainService = new BlockchainService();
    this.userService = new UserService();
  }

  async completeQuest(input: QuestCompletionInput) {
    const { questId, userId, verificationData } = input;

    // Get user
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get social connections
    const { data: socialConnections } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', userId);

    // Check if quest can be completed
    const canComplete = await this.questService.canCompleteQuest(questId, userId);
    if (!canComplete.canComplete) {
      throw new Error(canComplete.reason || 'Cannot complete quest');
    }

    // Get quest with requirements
    const questData = await this.questService.getQuestById(questId);
    if (!questData) {
      throw new Error('Quest not found');
    }

    // Verify all requirements
    const verificationResults = await Promise.all(
      (questData.requirements || []).map(async (requirement: any) => {
        const reqVerificationData = verificationData?.[requirement.id] || verificationData;
        return this.verificationService.verifyRequirement(
          requirement.type as any,
          requirement.verificationData as Record<string, any>,
          {
            address: user.address as `0x${string}`,
            twitterHandle: user.twitterHandle || undefined,
            discordId: user.discordId || undefined,
          }
        );
      })
    );

    // Check if all requirements are verified
    const allVerified = verificationResults.every(result => result.verified);
    if (!allVerified) {
      const failedVerifications = verificationResults
        .filter(r => !r.verified)
        .map(r => r.error)
        .join(', ');
      throw new Error(`Verification failed: ${failedVerifications}`);
    }

    // Create completion record
    const { data: completion, error: completionError } = await supabase
      .from('quest_completions')
      .insert({
        quest_id: questId,
        user_id: userId,
        xp_earned: questData.xpReward,
        trust_earned: questData.trustReward || null,
        verified: true,
        verification_data: verificationData || {},
      })
      .select()
      .single();

    if (completionError) {
      console.error('Error creating completion:', completionError);
      throw new Error(completionError.message);
    }

    // Update user XP
    await this.xpService.addXP(userId, questData.xpReward);

    // Distribute trust tokens if applicable
    if (questData.trustReward && questData.trustReward > 0) {
      try {
        const txHash = await this.blockchainService.distributeTrustToken(
          user.address as `0x${string}`,
          questData.trustReward.toString()
        );

        // Update completion with transaction hash
        await supabase
          .from('quest_completions')
          .update({ claim_id: txHash })
          .eq('id', completion.id);

        // Record transaction
        await supabase
          .from('trust_token_transactions')
          .insert({
            user_id: userId,
            address: user.address,
            amount: questData.trustReward.toString(),
            type: 'QUEST_REWARD',
            quest_id: questId,
            tx_hash: txHash,
            status: 'PROCESSING',
          });
      } catch (error: any) {
        console.error('Error distributing trust token:', error);
        // Don't fail the completion if token distribution fails
      }
    }

    // Update quest completion count
    const currentCount = questData.completedCount || 0;
    await supabase
      .from('quests')
      .update({ completed_count: currentCount + 1 })
      .eq('id', questId);

    // Fetch full completion with relations
    return this.mapCompletionFromDb(completion, questData, user);
  }

  async getUserCompletions(userId: string, limit = 50) {
    const { data: completions, error } = await supabase
      .from('quest_completions')
      .select(`
        *,
        quests!quest_completions_quest_id_fkey (
          *,
          projects (*)
        )
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user completions:', error);
      throw new Error(error.message);
    }

    return (completions || []).map((comp: any) => this.mapCompletionFromDb(comp, comp.quests, null));
  }

  async getQuestCompletions(questId: string, limit = 100) {
    const { data: completions, error } = await supabase
      .from('quest_completions')
      .select(`
        *,
        users!quest_completions_user_id_fkey (
          address,
          username
        )
      `)
      .eq('quest_id', questId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching quest completions:', error);
      throw new Error(error.message);
    }

    return (completions || []).map((comp: any) => ({
      id: comp.id,
      questId: comp.quest_id,
      userId: comp.user_id,
      xpEarned: comp.xp_earned,
      trustEarned: comp.trust_earned ? parseFloat(comp.trust_earned.toString()) : null,
      verified: comp.verified,
      verificationData: comp.verification_data,
      completedAt: new Date(comp.completed_at),
      claimId: comp.claim_id,
      user: comp.users ? {
        address: comp.users.address,
        username: comp.users.username,
      } : null,
    }));
  }

  /**
   * Map database row to Completion interface
   */
  private mapCompletionFromDb(row: any, quest?: any, user?: any) {
    return {
      id: row.id,
      questId: row.quest_id || quest?.id,
      userId: row.user_id,
      xpEarned: row.xp_earned,
      trustEarned: row.trust_earned ? parseFloat(row.trust_earned.toString()) : null,
      verified: row.verified,
      verificationData: row.verification_data,
      completedAt: new Date(row.completed_at),
      claimId: row.claim_id || null,
      quest: quest || null,
      user: user || null,
    };
  }
}
