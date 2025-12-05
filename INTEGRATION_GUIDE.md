# Frontend-Backend Integration Guide

## Overview

The frontend has been updated to use the backend API instead of localStorage. This guide explains the integration and how to complete the setup.

## What's Been Done

### ✅ Backend Setup
- Complete database schema with Prisma
- RESTful API endpoints for all operations
- Authentication middleware
- Verification system for quest requirements
- XP and leaderboard services
- Blockchain integration for trust tokens

### ✅ Frontend Integration
- API client service (`apiClient.ts`)
- Updated quest service to use backend
- Updated leaderboard service to use backend
- Updated trust balance hook to use backend
- Updated UserDashboard to fetch real data
- Authentication utilities

## Setup Steps

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and set DATABASE_URL

# Setup database
npm run prisma:generate
npm run prisma:migrate

# Start backend server
npm run dev
```

Backend will run on http://localhost:3001

### 2. Frontend Setup

```bash
cd frontend

# Install axios if not already installed
npm install axios

# Create .env file
cp .env.example .env
# Edit .env and set VITE_API_URL=http://localhost:3001/api

# Start frontend
npm run dev
```

### 3. Authentication Flow

The frontend needs to authenticate with the backend. Currently, the auth is simplified. To implement full authentication:

1. **Backend**: Create a `/api/auth/login` endpoint that:
   - Accepts wallet address and signature
   - Verifies signature
   - Returns JWT token

2. **Frontend**: Update `frontend/src/utils/auth.ts` to:
   - Sign a message with the wallet
   - Send signature to backend
   - Store JWT token

Example implementation:

```typescript
// In frontend/src/utils/auth.ts
export async function generateAuthToken(address: string): Promise<string | null> {
  const message = `Sign to authenticate with TrustQuests\n\nAddress: ${address}`;
  
  // Sign with wallet (using wagmi)
  const signature = await signMessage({ message });
  
  // Send to backend
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, message, signature }),
  });
  
  const { token } = await response.json();
  apiClient.setAuthToken(token);
  return token;
}
```

## API Endpoints

### Quests
- `GET /api/quests` - List quests
- `GET /api/quests/:id` - Get quest details
- `POST /api/quests` - Create quest (auth required)
- `POST /api/quests/:id/complete` - Complete quest (auth required)

### Users
- `GET /api/users/:address/xp` - Get user XP
- `GET /api/users/:address/completions` - Get user completions
- `GET /api/users/:address/trust-balance` - Get trust balance
- `GET /api/users/:address/rank` - Get user rank

### Leaderboard
- `GET /api/leaderboard` - Get leaderboard

## Testing the Integration

1. **Start both servers**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

2. **Test API connection**
   - Open browser console
   - Check for API calls in Network tab
   - Verify no CORS errors

3. **Test quest creation**
   - Connect wallet
   - Create a quest
   - Check backend logs for API call

4. **Test quest completion**
   - Complete a quest
   - Verify XP updates in database
   - Check leaderboard updates

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/trustquests
PORT=3001
JWT_SECRET=your-secret-key
RPC_URL=https://eth.llamarpc.com
TRUST_TOKEN_ADDRESS=0x...
PRIVATE_KEY=0x... (for token distribution)
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
VITE_PRIVY_APP_ID=your-privy-app-id
```

## Next Steps

1. **Implement full authentication**
   - Add `/api/auth/login` endpoint
   - Update frontend auth flow
   - Add signature verification

2. **Add real verification**
   - Integrate Twitter API for social tasks
   - Complete on-chain verification
   - Add webhook support

3. **Error handling**
   - Add error boundaries
   - Improve error messages
   - Add retry logic

4. **Caching**
   - Add React Query caching
   - Implement optimistic updates
   - Add offline support

## Troubleshooting

### CORS Errors
- Ensure backend has CORS enabled (already done)
- Check `VITE_API_URL` matches backend URL

### 401 Unauthorized
- Check authentication token is set
- Verify JWT_SECRET matches
- Check token expiration

### Database Connection Errors
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Verify database exists

### API Not Found
- Check backend is running
- Verify API_URL in frontend
- Check route paths match

## Support

For issues or questions:
1. Check backend logs: `npm run dev` in backend
2. Check frontend console for errors
3. Verify environment variables
4. Check database connection with Prisma Studio

