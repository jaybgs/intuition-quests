# Database Setup Guide

## Quick Start

### 1. Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Or use Chocolatey: `choco install postgresql`

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE trustquests;

# Create user (optional)
CREATE USER trustquests_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE trustquests TO trustquests_user;

# Exit
\q
```

### 3. Configure Environment

Create `.env` file in `backend/` directory:

```env
DATABASE_URL="postgresql://trustquests_user:your_password@localhost:5432/trustquests?schema=public"
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
RPC_URL=https://eth.llamarpc.com
TRUST_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
PRIVATE_KEY=your-private-key-for-trust-token-distribution
```

### 4. Run Migrations

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
```

Or use the setup script:

**Windows (PowerShell):**
```powershell
.\scripts\setup-db.ps1
```

**Linux/macOS:**
```bash
chmod +x scripts/setup-db.sh
./scripts/setup-db.sh
```

### 5. Verify Setup

```bash
# Open Prisma Studio to view your database
npm run prisma:studio
```

### 6. Start Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## Troubleshooting

### Connection Issues

- Ensure PostgreSQL is running: `pg_isready`
- Check if port 5432 is available
- Verify DATABASE_URL format is correct
- Check PostgreSQL logs for errors

### Migration Issues

- If migrations fail, try: `npx prisma db push` (development only)
- Reset database: `npx prisma migrate reset` (⚠️ deletes all data)
- Check Prisma schema syntax

### Common Errors

**"relation does not exist"**
- Run migrations: `npm run prisma:migrate`

**"password authentication failed"**
- Check DATABASE_URL credentials
- Verify PostgreSQL user permissions

**"port already in use"**
- Change PORT in .env file
- Or stop the process using port 3001

