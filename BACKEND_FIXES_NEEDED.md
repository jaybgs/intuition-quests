# Backend Fixes Needed

## Current Issues

### 1. Backend API 500 Errors ⚠️

The backend is returning 500 errors for `/api/spaces` endpoints. This is likely due to:

- **Database table missing**: The Space table may not exist in the database
- **Migrations not run**: Prisma migrations may not have been executed
- **Database connection issue**: Database may not be running or connection string is incorrect

### Solution

Run these commands in the backend directory:

```bash
cd backend

# 1. Generate Prisma client
npm run prisma:generate

# 2. Run migrations to create tables
npm run prisma:migrate

# OR if migrations don't exist, push the schema directly:
npm run db:push
```

### 2. Frontend ABI Updated ✅

The CreateSpace service ABI has been updated to match the deployed contract:
- Changed return type from `uint256` to `bytes32`
- Updated event to use `bytes32 spaceTermId`

## Quick Fix Steps

1. **Check if backend is running:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Check database connection:**
   - Verify `DATABASE_URL` in `backend/.env` is correct
   - Ensure PostgreSQL is running

3. **Run migrations:**
   ```bash
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. **Restart backend server**

5. **Restart frontend dev server** to pick up ABI changes

## Expected Behavior After Fix

- ✅ `/api/spaces` should return 200 with empty array `{ spaces: [] }` if no spaces exist
- ✅ `/api/spaces/owner/:address` should return 200 with empty array `{ spaces: [] }` if no spaces exist
- ✅ Space creation should work with bytes32 termIds

---

**Note**: The MetaMask wallet extension warnings are normal and don't affect functionality - they just indicate multiple wallet extensions are installed.

