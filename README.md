# Intuition Quests

A decentralized quest platform built on 0xIntuition mainnet, similar to Layer3, where users can create and complete quests to earn XP and Intuition claims.

## Project Structure

```
intuition-quests/
├── frontend/          # React + Vite frontend application
│   ├── src/          # Source code
│   ├── package.json  # Frontend dependencies
│   └── vite.config.ts
├── backend/          # Express.js backend API
│   ├── src/          # Source code
│   ├── package.json  # Backend dependencies
│   └── tsconfig.json
└── package.json      # Root package.json with workspace scripts
```

## Features

- 🎯 Create and manage quests
- 🏆 Earn XP and Intuition claims for completing quests
- 📊 Global leaderboard
- 👤 User profiles with quest history
- 🔗 Integration with 0xIntuition protocol

## Setup

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install all dependencies (root, frontend, and backend):
```bash
npm run install:all
```

Or install individually:
```bash
# Root dependencies
npm install

# Frontend dependencies
cd frontend && npm install

# Backend dependencies
cd backend && npm install
```

### Configuration

1. **Frontend Environment Variables:**
   - Copy `.env.example` to `frontend/.env` (if it exists)
   - Add your Privy App ID:
     ```
     VITE_PRIVY_APP_ID=your_privy_app_id
     ```

2. **Backend Environment Variables:**
   - Copy `backend/.env.example` to `backend/.env`
   - Configure your backend settings:
     ```
     PORT=3001
     NODE_ENV=development
     ```

## Development

### Run Frontend Only
```bash
npm run dev:frontend
# or
cd frontend && npm run dev
```

### Run Backend Only
```bash
npm run dev:backend
# or
cd backend && npm run dev
```

### Run Both (Frontend + Backend)
```bash
npm run dev:all
```

This will start:
- Frontend on http://localhost:5173 (Vite default)
- Backend on http://localhost:3001

## Building for Production

### Build Everything
```bash
npm run build
```

### Build Individually
```bash
npm run build:frontend
npm run build:backend
```

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- Wagmi (Ethereum wallet connection)
- TanStack Query (Data fetching)
- Privy (Authentication)
- Viem (Ethereum library)

### Backend
- Node.js + Express
- TypeScript
- Viem/Ethers (Blockchain interactions)

## Project Structure Details

### Frontend (`frontend/`)
- `src/components/` - React components
- `src/services/` - Business logic and API services
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions

### Backend (`backend/`)
- `src/index.ts` - Express server entry point
- `src/routes/` - API route handlers (to be created)
- `src/services/` - Business logic (to be created)
- `src/types/` - TypeScript type definitions (to be created)

## Next Steps

1. Configure 0xIntuition mainnet network details
2. Implement actual Intuition protocol interactions
3. Add quest verification logic
4. Set up database for persistent storage
5. Deploy to production

## API Endpoints (Backend)

- `GET /health` - Health check
- `GET /api/quests` - Get all quests
- `POST /api/quests` - Create a quest
- `GET /api/leaderboard` - Get leaderboard
- `GET /api/user/:address/xp` - Get user XP
