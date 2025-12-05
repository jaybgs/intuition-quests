// Shared types for backend

export interface QuestCreateInput {
  title: string;
  description: string;
  projectId: string;
  projectName?: string;
  xpReward: number;
  trustReward?: number;
  requirements: QuestRequirementInput[];
  maxCompletions?: number;
  expiresAt?: Date;
}

export interface QuestRequirementInput {
  type: RequirementType;
  description: string;
  verificationData: Record<string, any>;
  order?: number;
}

export enum RequirementType {
  FOLLOW = 'FOLLOW',
  RETWEET = 'RETWEET',
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  MENTION = 'MENTION',
  VISIT = 'VISIT',
  VERIFY_WALLET = 'VERIFY_WALLET',
  TRANSACTION = 'TRANSACTION',
  NFT_HOLD = 'NFT_HOLD',
  TOKEN_BALANCE = 'TOKEN_BALANCE',
  CONTRACT_INTERACTION = 'CONTRACT_INTERACTION',
  SIGNUP = 'SIGNUP',
  CUSTOM = 'CUSTOM',
  SEQUENCE = 'SEQUENCE',
  TIME_BASED = 'TIME_BASED',
}

export interface VerificationResult {
  verified: boolean;
  error?: string;
  data?: Record<string, any>;
}

export interface QuestCompletionInput {
  questId: string;
  userId: string;
  verificationData?: Record<string, any>;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  username?: string;
  totalXP: number;
  level: number;
  questsCompleted: number;
}

export interface UserStats {
  totalXP: number;
  level: number;
  questsCompleted: number;
  claimsStaked: number;
  tradeVolume: number;
}

