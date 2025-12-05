# Database Setup Guide

## Quick Start

### Option 1: Using PostgreSQL (Recommended)

1. **Install PostgreSQL**
   - Download from https://www.postgresql.org/download/
   - Or use Docker: `docker run --name trustquests-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=trustquests -p 5432:5432 -d postgres`

2. **Create `.env` file**
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/trustquests?schema=public"
   ```

3. **Run setup script**
   ```bash
   # On Windows (PowerShell)
   .\scripts\setup-db.ps1
   
   # On Mac/Linux
   chmod +x scripts/setup-db.sh
   ./scripts/setup-db.sh
   ```

### Option 2: Using SQLite (Development Only)

1. **Update `prisma/schema.prisma`**
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```

2. **Update `.env`**
   ```env
   DATABASE_URL="file:./dev.db"
   ```

3. **Run migrations**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

## Manual Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

3. **Create database migration**
   ```bash
   npm run prisma:migrate
   ```

4. **(Optional) Seed database**
   ```bash
   npx tsx prisma/seed.ts
   ```

## Verify Setup

1. **Open Prisma Studio** (Database GUI)
   ```bash
   npm run prisma:studio
   ```
   This opens http://localhost:5555

2. **Check database connection**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3001/health

## Troubleshooting

### "Can't reach database server"
- Check PostgreSQL is running: `pg_isready` or check Docker container
- Verify DATABASE_URL in `.env` file
- Check firewall/port 5432 is open

### "Migration failed"
- Drop and recreate database: `DROP DATABASE trustquests; CREATE DATABASE trustquests;`
- Run migration again: `npm run prisma:migrate`

### "Prisma Client not generated"
- Run: `npm run prisma:generate`
- Check `node_modules/.prisma/client` exists

## Production Setup

For production, use a managed PostgreSQL service:
- **Supabase**: https://supabase.com
- **Railway**: https://railway.app
- **Neon**: https://neon.tech
- **AWS RDS**: https://aws.amazon.com/rds

Update `DATABASE_URL` in production environment variables.

