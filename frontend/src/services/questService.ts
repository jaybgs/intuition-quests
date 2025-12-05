import { Quest, QuestRequirement, UserXP } from '../types';
import { IntuitionService } from './intuitionService';
import type { Address } from 'viem';

export class QuestService {
  private intuitionService: IntuitionService;
  private quests: Map<string, Quest> = new Map();
  private userXP: Map<string, UserXP> = new Map();

  constructor() {
    this.intuitionService = new IntuitionService();
    this.loadFromStorage();
  }

  private loadFromStorage() {
    // Check if localStorage is available (browser environment)
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    // Load quests from localStorage
    try {
      const storedQuests = localStorage.getItem('quests');
      if (storedQuests) {
        const questsArray = JSON.parse(storedQuests);
        questsArray.forEach((quest: Quest) => {
          this.quests.set(quest.id, quest);
        });
      }

      // Load user XP from localStorage
      const storedXP = localStorage.getItem('userXP');
      if (storedXP) {
        const xpMap = JSON.parse(storedXP);
        Object.entries(xpMap).forEach(([address, xp]: [string, any]) => {
          this.userXP.set(address.toLowerCase(), xp);
        });
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }

  private saveToStorage() {
    // Check if localStorage is available (browser environment)
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      // Save quests to localStorage
      const questsArray = Array.from(this.quests.values());
      localStorage.setItem('quests', JSON.stringify(questsArray));

      // Save user XP to localStorage
      const xpMap: Record<string, UserXP> = {};
      this.userXP.forEach((xp, address) => {
        xpMap[address] = xp;
      });
      localStorage.setItem('userXP', JSON.stringify(xpMap));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  async createQuest(
    projectId: string,
    projectName: string,
    title: string,
    description: string,
    xpReward: number,
    requirements: QuestRequirement[]
  ): Promise<Quest> {
    const quest: Quest = {
      id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      projectId,
      projectName,
      xpReward,
      requirements,
      status: 'active',
      createdAt: Date.now(),
      completedBy: [],
    };

    this.quests.set(quest.id, quest);
    this.saveToStorage();
    return quest;
  }

  async completeQuest(
    questId: string,
    userAddress: Address
  ): Promise<{ xp: number; claimId: string }> {
    const quest = this.quests.get(questId);
    if (!quest) throw new Error('Quest not found');

    const addressLower = userAddress.toLowerCase();

    // Check if already completed
    if (quest.completedBy?.includes(addressLower)) {
      throw new Error('Quest already completed');
    }

    // Verify requirements are met
    // For MVP: Allow completion if no requirements or if requirements don't explicitly block completion
    // In production, this would check actual on-chain/off-chain verification (follow, retweet, etc.)
    // For now, we allow completion - verification can be added later
    if (quest.requirements.length > 0) {
      const hasUnverified = quest.requirements.some((req) => req.verified === false);
      if (hasUnverified) {
        throw new Error('Quest requirements not met');
      }
    }

    // Award XP
    const userXPData = this.userXP.get(addressLower) || {
      address: userAddress,
      totalXP: 0,
      questsCompleted: 0,
      claims: [],
    };

    userXPData.totalXP += quest.xpReward;
    userXPData.questsCompleted += 1;

    // Create Intuition claim
    const userAtomId = await this.intuitionService.createUserAtom(userAddress);
    const claimId = await this.intuitionService.createQuestClaim(
      userAtomId,
      questId,
      quest.xpReward
    );

    userXPData.claims.push({
      atomId: userAtomId,
      tripleId: claimId,
      questId,
      timestamp: Date.now(),
      xpAmount: quest.xpReward,
    });

    this.userXP.set(addressLower, userXPData);
    
    if (!quest.completedBy) {
      quest.completedBy = [];
    }
    quest.completedBy.push(addressLower);
    
    this.saveToStorage();

    return {
      xp: quest.xpReward,
      claimId,
    };
  }

  async getUserXP(userAddress: Address): Promise<UserXP> {
    const addressLower = userAddress.toLowerCase();
    return (
      this.userXP.get(addressLower) || {
        address: userAddress,
        totalXP: 0,
        questsCompleted: 0,
        claims: [],
      }
    );
  }

  async getAllQuests(): Promise<Quest[]> {
    return Array.from(this.quests.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }

  async getQuestById(questId: string): Promise<Quest | undefined> {
    return this.quests.get(questId);
  }

  async getQuestsByProject(projectId: string): Promise<Quest[]> {
    return Array.from(this.quests.values()).filter(
      (quest) => quest.projectId === projectId
    );
  }
}

