# TrustQuests Backend API

Backend API for the TrustQuests dApp, handling quest management, user XP, leaderboards, and blockchain integration.

## Features

- ✅ **Quest Management**: Create, read, update, and delete quests
- ✅ **Verification System**: Verify different types of quest requirements (social, on-chain, custom)
- ✅ **XP & Leaderboard**: Track user XP, levels, and rankings
- ✅ **Blockchain Integration**: Distribute trust tokens and verify on-chain activities
- ✅ **User Management**: Handle user profiles, social connections, and stats

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database
2. Copy `.env.example` to `.env` and update `DATABASE_URL`
3. Run Prisma migrations:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 3. Environment Variables

Create a `.env` file with the following variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/trustquests"
PORT=3001
JWT_SECRET=your-secret-key
RPC_URL=https://eth.llamarpc.com
TRUST_TOKEN_ADDRESS=0x...
PRIVATE_KEY=0x... (for token distribution)
```

### 4. Run Development Server

```bash
npm run dev
```

## API Endpoints

### Quests

- `GET /api/quests` - Get all quests
- `GET /api/quests/:id` - Get quest by ID
- `POST /api/quests` - Create new quest (requires auth)
- `PUT /api/quests/:id` - Update quest (requires auth)
- `DELETE /api/quests/:id` - Delete quest (requires auth)
- `POST /api/quests/:id/complete` - Complete a quest (requires auth)
- `GET /api/quests/:id/completions` - Get quest completions

### Users

- `GET /api/users/:address/xp` - Get user XP
- `GET /api/users/:address/completions` - Get user quest completions
- `GET /api/users/:address/trust-balance` - Get trust token balance
- `GET /api/users/:address/rank` - Get user rank

### Leaderboard

- `GET /api/leaderboard` - Get leaderboard

## Quest Requirement Types

- `FOLLOW` - Follow a Twitter/Discord account
- `RETWEET` - Retweet a post
- `LIKE` - Like a post
- `COMMENT` - Comment on a post
- `MENTION` - Mention in a post
- `VISIT` - Visit a website
- `VERIFY_WALLET` - Verify wallet ownership
- `TRANSACTION` - Make a transaction
- `NFT_HOLD` - Hold an NFT
- `TOKEN_BALANCE` - Maintain token balance
- `CONTRACT_INTERACTION` - Interact with a contract
- `SIGNUP` - Sign up for a service
- `CUSTOM` - Custom verification logic

## Database Schema

The database uses Prisma ORM with PostgreSQL. Key models:

- `User` - User accounts
- `UserXP` - User experience points and stats
- `Quest` - Quest definitions
- `QuestRequirement` - Quest requirements
- `QuestCompletion` - Quest completions
- `Project` - Projects/collections
- `Leaderboard` - Leaderboard entries
- `TrustTokenTransaction` - Trust token transactions

## Development

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open Prisma Studio (database GUI)
npx prisma studio

# Build for production
npm run build

# Start production server
npm start
```

## Next Steps

1. **Social Media Integration**: Implement actual Twitter/Discord API verification
2. **On-chain Verification**: Complete blockchain verification for transactions, NFTs, etc.
3. **Rate Limiting**: Add rate limiting to prevent abuse
4. **Caching**: Add Redis for caching leaderboards and quests
5. **Webhooks**: Add webhook support for real-time updates
6. **Admin Panel**: Create admin endpoints for quest moderation

