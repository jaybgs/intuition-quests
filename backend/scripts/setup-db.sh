#!/bin/bash

# Database setup script for TrustQuests

echo "🚀 Setting up TrustQuests database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please create a .env file with DATABASE_URL"
    exit 1
fi

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init

# Seed database (optional)
if [ -f "prisma/seed.ts" ]; then
    echo "🌱 Seeding database..."
    npx tsx prisma/seed.ts
fi

echo "✅ Database setup complete!"
echo ""
echo "You can now:"
echo "  - Start the server: npm run dev"
echo "  - Open Prisma Studio: npm run prisma:studio"
