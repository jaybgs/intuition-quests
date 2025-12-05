/**
 * Deterministic Raffle System
 * 
 * Uses a seed-based approach to ensure:
 * 1. Same input always produces same output (reproducible)
 * 2. Fair random selection
 * 3. Can be verified by anyone with the same inputs
 */

/**
 * Seeded Random Number Generator (Linear Congruential Generator)
 * This ensures deterministic randomness based on a seed
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    // Ensure seed is positive and within safe integer range
    this.seed = Math.abs(seed) % 2147483647;
    if (this.seed === 0) this.seed = 1; // LCG requires non-zero seed
  }

  /**
   * Generate next random number between 0 and 1
   * Uses LCG formula: (a * seed + c) mod m
   * Constants from Numerical Recipes (a=1664525, c=1013904223, m=2^32)
   */
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 2147483647;
    return this.seed / 2147483647;
  }

  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }
}

/**
 * Generate a deterministic seed from quest ID and end timestamp
 * This ensures the same quest with the same end time always produces the same winners
 */
function generateSeed(questId: string, endTimestamp: number): number {
  // Combine quest ID and end timestamp into a hash
  let hash = 0;
  const combined = `${questId}_${endTimestamp}`;
  
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash);
}

/**
 * Shuffle array using Fisher-Yates algorithm with seeded random
 * This ensures deterministic shuffling based on the seed
 */
function seededShuffle<T>(array: T[], seed: number): T[] {
  const rng = new SeededRandom(seed);
  const shuffled = [...array];
  
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

export interface QuestCompletion {
  address: string;
  completedAt: number; // Timestamp
  userName?: string;
}

/**
 * Select winners using raffle (deterministic random selection)
 * 
 * @param completions - Array of quest completions with timestamps
 * @param numberOfWinners - Number of winners to select
 * @param questId - Quest ID for seed generation
 * @param endTimestamp - Quest end timestamp for seed generation
 * @returns Array of winner addresses
 */
export function selectRaffleWinners(
  completions: QuestCompletion[],
  numberOfWinners: number,
  questId: string,
  endTimestamp: number
): string[] {
  if (completions.length === 0) {
    return [];
  }

  if (completions.length <= numberOfWinners) {
    // If we have fewer or equal completions to winners, everyone wins
    return completions.map(c => c.address.toLowerCase());
  }

  // Generate seed from quest ID and end timestamp
  const seed = generateSeed(questId, endTimestamp);
  
  // Shuffle completions deterministically
  const shuffled = seededShuffle(completions, seed);
  
  // Select first n winners
  return shuffled.slice(0, numberOfWinners).map(c => c.address.toLowerCase());
}

/**
 * Select winners using FCFS (First Come First Served)
 * 
 * @param completions - Array of quest completions (should be sorted by completedAt)
 * @param numberOfWinners - Number of winners to select
 * @returns Array of winner addresses
 */
export function selectFCFSWinners(
  completions: QuestCompletion[],
  numberOfWinners: number
): string[] {
  if (completions.length === 0) {
    return [];
  }

  // Sort by completion timestamp (earliest first)
  const sorted = [...completions].sort((a, b) => a.completedAt - b.completedAt);
  
  // Select first n winners
  return sorted.slice(0, numberOfWinners).map(c => c.address.toLowerCase());
}

/**
 * Get all quest completions with timestamps from localStorage
 */
export function getQuestCompletions(questId: string): QuestCompletion[] {
  try {
    const key = `quest_completions_${questId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading quest completions:', error);
  }
  return [];
}

/**
 * Save quest completion to localStorage with timestamp
 */
export function saveQuestCompletion(questId: string, address: string, userName?: string): void {
  try {
    const key = `quest_completions_${questId}`;
    const existing = getQuestCompletions(questId);
    
    // Check if already completed
    if (existing.some(c => c.address.toLowerCase() === address.toLowerCase())) {
      return; // Already completed
    }
    
    const completion: QuestCompletion = {
      address: address.toLowerCase(),
      completedAt: Date.now(),
      userName,
    };
    
    existing.push(completion);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (error) {
    console.error('Error saving quest completion:', error);
  }
}

/**
 * Get winners for a quest (from localStorage)
 */
export function getQuestWinners(questId: string): string[] {
  try {
    const key = `quest_winners_${questId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading quest winners:', error);
  }
  return [];
}

/**
 * Save winners for a quest to localStorage
 */
export function saveQuestWinners(questId: string, winners: string[]): void {
  try {
    const key = `quest_winners_${questId}`;
    localStorage.setItem(key, JSON.stringify(winners));
  } catch (error) {
    console.error('Error saving quest winners:', error);
  }
}

/**
 * Calculate and save winners for a quest based on distribution type
 */
export function calculateAndSaveWinners(
  questId: string,
  numberOfWinners: number,
  distributionType: 'fcfs' | 'raffle',
  endTimestamp: number
): string[] {
  const completions = getQuestCompletions(questId);
  
  let winners: string[];
  
  if (distributionType === 'fcfs') {
    winners = selectFCFSWinners(completions, numberOfWinners);
  } else {
    winners = selectRaffleWinners(completions, numberOfWinners, questId, endTimestamp);
  }
  
  saveQuestWinners(questId, winners);
  return winners;
}


