import { supabase } from '../config/supabase.js';
import { UserService } from './userService.js';

export class XPService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Get or create user XP record
   */
  async getUserXP(userAddress: string) {
    const user = await this.userService.getUserByAddress(userAddress);
    if (!user) {
      return null;
    }

    const { data: xp, error } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user XP:', error);
      throw new Error(error.message);
    }

    if (!xp) {
      // Create XP record if it doesn't exist
      const { data: newXp, error: createError } = await supabase
        .from('user_xp')
        .insert({
          user_id: user.id,
          total_xp: 0,
          quests_completed: 0,
          level: 1,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user XP:', createError);
        throw new Error(createError.message);
      }

      return this.mapXPFromDb(newXp);
    }

    return this.mapXPFromDb(xp);
  }

  /**
   * Add XP to user
   */
  async addXP(userId: string, xpAmount: number) {
    // Get current XP
    const { data: userXP, error: findError } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const newTotalXP = (userXP?.total_xp || 0) + xpAmount;
    const newLevel = this.calculateLevel(newTotalXP);
    const newQuestsCompleted = (userXP?.quests_completed || 0) + 1;

    let updatedXP;

    if (!userXP) {
      // Create if doesn't exist
      const { data, error } = await supabase
        .from('user_xp')
        .insert({
          user_id: userId,
          total_xp: newTotalXP,
          quests_completed: 1,
          level: newLevel,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user XP:', error);
        throw new Error(error.message);
      }
      updatedXP = data;
    } else {
      // Update existing
      const { data, error } = await supabase
        .from('user_xp')
        .update({
          total_xp: newTotalXP,
          quests_completed: newQuestsCompleted,
          level: newLevel,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user XP:', error);
        throw new Error(error.message);
      }
      updatedXP = data;
    }

    // Update leaderboard
    const user = await this.userService.getUserById(userId);
    if (user) {
      await this.updateLeaderboard(userId, user.address, newTotalXP, newLevel, newQuestsCompleted);
    }

    return this.mapXPFromDb(updatedXP);
  }

  /**
   * Calculate level based on XP
   */
  private calculateLevel(totalXP: number): number {
    return Math.floor(totalXP / 1000) + 1;
  }

  /**
   * Update leaderboard
   */
  async updateLeaderboard(userId: string, address: string, totalXP: number, level: number, questsCompleted: number) {
    // Check if leaderboard entry exists
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      // Create entry
      await supabase
        .from('leaderboard')
        .insert({
          user_id: userId,
          address: address.toLowerCase(),
          total_xp: totalXP,
          level: level,
          rank: 0, // Will be recalculated
        });
    } else {
      // Update entry
      await supabase
        .from('leaderboard')
        .update({
          total_xp: totalXP,
          level: level,
        })
        .eq('user_id', userId);
    }

    // Recalculate ranks
    await this.recalculateRanks();
  }

  /**
   * Recalculate all leaderboard ranks
   */
  async recalculateRanks() {
    const { data: entries, error } = await supabase
      .from('leaderboard')
      .select('user_id')
      .order('total_xp', { ascending: false });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return;
    }

    // Update ranks in batch
    for (let i = 0; i < entries.length; i++) {
      await supabase
        .from('leaderboard')
        .update({ rank: i + 1 })
        .eq('user_id', entries[i].user_id);
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit = 100, offset = 0) {
    const { data: entries, error } = await supabase
      .from('leaderboard')
      .select(`
        *,
        users!leaderboard_user_id_fkey (
          username,
          address
        )
      `)
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      throw new Error(error.message);
    }

    return (entries || []).map((entry: any) => ({
      rank: entry.rank,
      address: entry.address,
      username: entry.users?.username,
      totalXP: entry.total_xp,
      level: entry.level,
      questsCompleted: entry.quests_completed || 0,
    }));
  }

  /**
   * Get user rank
   */
  async getUserRank(userAddress: string): Promise<number | null> {
    const user = await this.userService.getUserByAddress(userAddress);
    if (!user) return null;

    const { data, error } = await supabase
      .from('leaderboard')
      .select('rank')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user rank:', error);
      return null;
    }

    return data?.rank || null;
  }

  /**
   * Update user stats
   */
  async updateUserStats(userId: string, stats: {
    claimsStaked?: number;
    tradeVolume?: number;
  }) {
    const updateData: any = {};

    if (stats.claimsStaked !== undefined) {
      updateData.claims_staked = stats.claimsStaked;
    }

    if (stats.tradeVolume !== undefined) {
      updateData.trade_volume = stats.tradeVolume;
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('user_xp')
        .update(updateData)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user stats:', error);
        throw new Error(error.message);
      }
    }
  }

  /**
   * Map database row to XP interface
   */
  private mapXPFromDb(row: any) {
    return {
      id: row.id,
      userId: row.user_id,
      totalXP: row.total_xp,
      questsCompleted: row.quests_completed,
      claimsStaked: row.claims_staked || 0,
      tradeVolume: row.trade_volume || 0,
      level: row.level,
      updatedAt: new Date(row.updated_at),
    };
  }
}
