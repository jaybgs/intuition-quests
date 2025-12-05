-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('FOLLOW', 'RETWEET', 'LIKE', 'COMMENT', 'MENTION', 'VISIT', 'VERIFY_WALLET', 'TRANSACTION', 'NFT_HOLD', 'TOKEN_BALANCE', 'CONTRACT_INTERACTION', 'SIGNUP', 'CUSTOM', 'SEQUENCE', 'TIME_BASED');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('TWITTER', 'DISCORD', 'EMAIL', 'GITHUB');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('QUEST_REWARD', 'STAKING_REWARD', 'REFERRAL_BONUS', 'ADMIN_AWARD');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SpaceUserType" AS ENUM ('PROJECT', 'USER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "username" TEXT,
    "profilePic" TEXT,
    "twitterHandle" TEXT,
    "discordId" TEXT,
    "email" TEXT,
    "githubHandle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_xp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "questsCompleted" INTEGER NOT NULL DEFAULT 0,
    "claimsStaked" INTEGER NOT NULL DEFAULT 0,
    "tradeVolume" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_xp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "trustReward" DECIMAL(18,2),
    "status" "QuestStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxCompletions" INTEGER,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_requirements" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "type" "RequirementType" NOT NULL,
    "description" TEXT NOT NULL,
    "verificationData" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quest_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_completions" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xpEarned" INTEGER NOT NULL,
    "trustEarned" DECIMAL(18,2),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationData" JSONB,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimId" TEXT,

    CONSTRAINT "quest_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "platformId" TEXT NOT NULL,
    "username" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "totalXP" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_token_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "questId" TEXT,
    "txHash" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "trust_token_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logo" TEXT,
    "twitterUrl" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "userType" "SpaceUserType" NOT NULL,
    "atomId" TEXT,
    "atomTransactionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_address_key" ON "users"("address");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_address_idx" ON "users"("address");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_xp_userId_key" ON "user_xp"("userId");

-- CreateIndex
CREATE INDEX "projects_owner_idx" ON "projects"("owner");

-- CreateIndex
CREATE INDEX "quests_projectId_idx" ON "quests"("projectId");

-- CreateIndex
CREATE INDEX "quests_status_idx" ON "quests"("status");

-- CreateIndex
CREATE INDEX "quests_createdAt_idx" ON "quests"("createdAt");

-- CreateIndex
CREATE INDEX "quest_requirements_questId_idx" ON "quest_requirements"("questId");

-- CreateIndex
CREATE UNIQUE INDEX "quest_completions_claimId_key" ON "quest_completions"("claimId");

-- CreateIndex
CREATE INDEX "quest_completions_userId_idx" ON "quest_completions"("userId");

-- CreateIndex
CREATE INDEX "quest_completions_questId_idx" ON "quest_completions"("questId");

-- CreateIndex
CREATE INDEX "quest_completions_completedAt_idx" ON "quest_completions"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "quest_completions_questId_userId_key" ON "quest_completions"("questId", "userId");

-- CreateIndex
CREATE INDEX "social_connections_userId_idx" ON "social_connections"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "social_connections_userId_platform_key" ON "social_connections"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_userId_key" ON "leaderboard"("userId");

-- CreateIndex
CREATE INDEX "leaderboard_rank_idx" ON "leaderboard"("rank");

-- CreateIndex
CREATE INDEX "leaderboard_totalXP_idx" ON "leaderboard"("totalXP");

-- CreateIndex
CREATE UNIQUE INDEX "trust_token_transactions_txHash_key" ON "trust_token_transactions"("txHash");

-- CreateIndex
CREATE INDEX "trust_token_transactions_userId_idx" ON "trust_token_transactions"("userId");

-- CreateIndex
CREATE INDEX "trust_token_transactions_address_idx" ON "trust_token_transactions"("address");

-- CreateIndex
CREATE INDEX "trust_token_transactions_txHash_idx" ON "trust_token_transactions"("txHash");

-- CreateIndex
CREATE INDEX "trust_token_transactions_status_idx" ON "trust_token_transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "spaces_slug_key" ON "spaces"("slug");

-- CreateIndex
CREATE INDEX "spaces_ownerAddress_idx" ON "spaces"("ownerAddress");

-- CreateIndex
CREATE INDEX "spaces_slug_idx" ON "spaces"("slug");

-- CreateIndex
CREATE INDEX "spaces_createdAt_idx" ON "spaces"("createdAt");

-- AddForeignKey
ALTER TABLE "user_xp" ADD CONSTRAINT "user_xp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_requirements" ADD CONSTRAINT "quest_requirements_questId_fkey" FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_completions" ADD CONSTRAINT "quest_completions_questId_fkey" FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_completions" ADD CONSTRAINT "quest_completions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
