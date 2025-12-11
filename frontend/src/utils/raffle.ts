/**
 * Raffle utilities for quest winners and completions
 * Uses localStorage for persistence
 */

/**
 * Get quest completions from localStorage
 */
export function getQuestCompletions(questId: string): Array<{ address: string; timestamp: number }> {
  try {
    const stored = localStorage.getItem(`quest_completions_${questId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save quest completion to localStorage
 */
export function saveQuestCompletion(questId: string, address: string): void {
  try {
    const key = `quest_completions_${questId}`;
    const existing = localStorage.getItem(key);
    const completions: Array<{ address: string; timestamp: number }> = existing ? JSON.parse(existing) : [];
    
    // Check if address already completed
    if (!completions.some(c => c.address.toLowerCase() === address.toLowerCase())) {
      completions.push({
        address: address.toLowerCase(),
        timestamp: Date.now(),
      });
      localStorage.setItem(key, JSON.stringify(completions));
    }
  } catch (error) {
    console.error('Error saving quest completion:', error);
  }
}

/**
 * Get quest winners from localStorage
 */
export function getQuestWinners(questId: string): string[] {
  try {
    const stored = localStorage.getItem(`quest_winners_${questId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Calculate and save winners based on distribution type
 */
export function calculateAndSaveWinners(
  questId: string,
  numWinners: number,
  distributionType: string,
  expiresAt: number
): string[] {
  try {
    const completions = getQuestCompletions(questId);
    if (completions.length === 0) return [];
    
    let winners: string[] = [];
    if (distributionType === 'raffle') {
      // Random selection
      const shuffled = [...completions].sort(() => Math.random() - 0.5);
      winners = shuffled.slice(0, Math.min(numWinners, shuffled.length)).map(c => c.address || c);
    } else if (distributionType === 'fcfs') {
      // First come first served (sorted by timestamp)
      const sorted = [...completions].sort((a, b) => a.timestamp - b.timestamp);
      winners = sorted.slice(0, Math.min(numWinners, sorted.length)).map(c => c.address || c);
    }
    
    localStorage.setItem(`quest_winners_${questId}`, JSON.stringify(winners));
    return winners;
  } catch {
    return [];
  }
}









