# Database setup script for TrustQuests (PowerShell)

Write-Host "🚀 Setting up TrustQuests database..." -ForegroundColor Green

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ Error: DATABASE_URL environment variable is not set" -ForegroundColor Red
    Write-Host "Please create a .env file with DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

# Generate Prisma Client
Write-Host "📦 Generating Prisma Client..." -ForegroundColor Cyan
npx prisma generate

# Run migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Cyan
npx prisma migrate dev --name init

# Seed database (optional)
if (Test-Path "prisma/seed.ts") {
    Write-Host "🌱 Seeding database..." -ForegroundColor Cyan
    npx tsx prisma/seed.ts
}

Write-Host "✅ Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now:" -ForegroundColor Yellow
Write-Host "  - Start the server: npm run dev"
Write-Host "  - Open Prisma Studio: npm run prisma:studio"
