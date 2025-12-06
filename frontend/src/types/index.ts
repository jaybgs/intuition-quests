export interface Quest {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  xpReward: number;
  intuitionClaimId?: string;
  requirements: QuestRequirement[];
  status: 'active' | 'completed' | 'pending';
  createdAt: number;
  completedBy?: string[];
  progress?: number;
  steps?: QuestStep[];
  completedSteps?: number;
  completedCount?: number; // Number of times quest has been completed
  image?: string; // Quest image URL or base64
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: string;
  creatorType?: 'project' | 'community'; // Distinguish between project and community quests
  creatorAddress?: string; // Address of the community member who created it
  expiresAt?: number; // Timestamp when the quest expires
  twitterLink?: string; // Twitter/X profile link of the creator
  atomId?: string; // Intuition atom ID created on-chain when quest is published
  atomTransactionHash?: string; // Transaction hash of atom creation
  tripleId?: string; // Triple/claim ID for quest completion (created when user completes)
  distributionType?: 'fcfs' | 'raffle'; // Reward distribution type: First Come First Served or Raffle
  iqPoints?: number; // IQ points users earn for completing this quest
  numberOfWinners?: number | string; // Number of winners for the quest
  winnerPrizes?: string[]; // Prize amounts for each winner
  rewardDeposit?: string; // Total deposit amount
  rewardToken?: string; // Token type for rewards
}

export interface QuestStep {
  id: string;
  title: string;
  description: string;
  completed?: boolean;
  link?: string; // URL to open when task is clicked (e.g., Twitter profile, Discord invite, etc.)
}

export interface QuestRequirement {
  type: 'follow' | 'retweet' | 'visit' | 'custom' | 'verify';
  description: string;
  verification: string;
  verified?: boolean;
}

export interface UserXP {
  address: string;
  totalXP: number;
  questsCompleted: number;
  claims: IntuitionClaim[];
  rank?: number;
}

export interface IntuitionClaim {
  atomId: string;
  tripleId: string;
  questId: string;
  timestamp: number;
  xpAmount: number;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  totalXP: number;
  questsCompleted: number;
  displayName?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  owner: string;
  quests: string[];
  createdAt: number;
}

export interface Space {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo?: string; // Base64 or URL
  twitterUrl: string;
  ownerAddress: string;
  userType: 'project' | 'user';
  createdAt: number;
  atomId?: string; // Intuition atom ID created on-chain
  atomTransactionHash?: string; // Transaction hash of atom creation
}

