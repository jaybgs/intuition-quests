import { apiClient } from './apiClient';
import type { LeaderboardEntry } from '../types';

/**
 * Backend-based Leaderboard Service
 */
export class LeaderboardServiceBackend {
  async getGlobalLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    try {
      const leaderboard = await apiClient.getLeaderboard(limit, 0);
      return leaderboard.map((entry: any) => ({
        rank: entry.rank,
        address: entry.address,
        displayName: entry.username,
        totalXP: entry.totalXP,
        questsCompleted: entry.questsCompleted || 0,
      }));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  async getUserRank(userAddress: string): Promise<number> {
    try {
      const rank = await apiClient.getUserRank(userAddress);
      return rank || -1;
    } catch (error) {
      console.error('Error fetching user rank:', error);
      return -1;
    }
  }

  async getTopUsers(count: number = 10): Promise<LeaderboardEntry[]> {
    return this.getGlobalLeaderboard(count);
  }
}

