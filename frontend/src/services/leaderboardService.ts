import { LeaderboardEntry, UserXP } from '../types';
import { QuestService } from './questService';
import type { Address } from 'viem';

export class LeaderboardService {
  private questService: QuestService;

  constructor(questService: QuestService) {
    this.questService = questService;
  }

  async getGlobalLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    // Check if localStorage is available
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    // Load all user XP data
    try {
      const storedXP = localStorage.getItem('userXP');
      if (!storedXP) return [];

      const xpMap: Record<string, UserXP> = JSON.parse(storedXP);
    const entries: LeaderboardEntry[] = Object.entries(xpMap)
      .map(([address, xp]) => ({
        rank: 0, // Will be set after sorting
        address: xp.address,
        totalXP: xp.totalXP,
        questsCompleted: xp.questsCompleted,
      }))
      .sort((a, b) => b.totalXP - a.totalXP)
      .slice(0, limit)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

      return entries;
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      return [];
    }
  }

  async getUserRank(userAddress: Address): Promise<number> {
    const leaderboard = await this.getGlobalLeaderboard();
    const rank = leaderboard.findIndex(
      (entry) => entry.address.toLowerCase() === userAddress.toLowerCase()
    );
    return rank >= 0 ? rank + 1 : -1;
  }

  async getTopUsers(count: number = 10): Promise<LeaderboardEntry[]> {
    return this.getGlobalLeaderboard(count);
  }
}

