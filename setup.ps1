# Quick Setup Script for Windows PowerShell

Write-Host "🚀 WorkZen Full Stack - Setup Script" -ForegroundColor Green
Write-Host ""

# Check if .env exists
if (!(Test-Path ".env")) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file. Please edit it with your database credentials!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Update the following in .env:" -ForegroundColor Yellow
    Write-Host "   DATABASE_URL=postgresql://username:password@localhost:5432/workzen_db" -ForegroundColor Cyan
    Write-Host "   JWT_SECRET=your-super-secret-key-change-in-production" -ForegroundColor Cyan
    Write-Host ""
    $continue = Read-Host "Press Enter after updating .env file, or Ctrl+C to exit"
}

Write-Host "🔧 Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

Write-Host ""
Write-Host "📦 Running database migrations..." -ForegroundColor Yellow
npx prisma migrate dev --name init

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start the development server: npm run dev" -ForegroundColor White
Write-Host "2. Visit http://localhost:3000/api/seed to create test users" -ForegroundColor White
Write-Host "3. Login with:" -ForegroundColor White
Write-Host "   - Admin: admin@workzen.com / admin123" -ForegroundColor Gray
Write-Host "   - Manager: ananya@workzen.com / password123" -ForegroundColor Gray
Write-Host "   - Employee: rohit@workzen.com / password123" -ForegroundColor Gray
Write-Host ""
