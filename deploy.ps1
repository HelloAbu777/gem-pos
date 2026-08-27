# GEM POS - Vercel Deployment Script
# PowerShell script for Windows

Write-Host "🚀 GEM POS - Vercel ga Deploy Qilish" -ForegroundColor Cyan
Write-Host "=====================================`n" -ForegroundColor Cyan

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "Git initsializatsiya qilinmoqda..." -ForegroundColor Yellow
    git init
    git add .
    git commit -m "Initial commit: GEM POS System"
    Write-Host "✅ Git tayyor`n" -ForegroundColor Green
}

# Check if Vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI o'rnatilmagan" -ForegroundColor Red
    Write-Host "`nO'rnatish uchun:" -ForegroundColor Yellow
    Write-Host "npm install -g vercel`n" -ForegroundColor White
    exit 1
}

# Run build test
Write-Host "🔨 Build test qilinmoqda..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build xatosi! Iltimos xatolarni tuzating.`n" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build muvaffaqiyatli`n" -ForegroundColor Green

# Deploy prompt
Write-Host "Deploy qilishni davom ettirasizmi? (y/n): " -ForegroundColor Cyan -NoNewline
$response = Read-Host

if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "`n🚀 Vercel ga deploy qilinmoqda...`n" -ForegroundColor Yellow
    vercel --prod
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Deploy muvaffaqiyatli!`n" -ForegroundColor Green
        Write-Host "Environment Variables ni sozlashni unutmang:" -ForegroundColor Yellow
        Write-Host "  1. DATABASE_URL" -ForegroundColor White
        Write-Host "  2. NEXTAUTH_SECRET" -ForegroundColor White
        Write-Host "  3. NEXTAUTH_URL`n" -ForegroundColor White
    } else {
        Write-Host "`n❌ Deploy xatosi!`n" -ForegroundColor Red
    }
} else {
    Write-Host "`nDeploy bekor qilindi.`n" -ForegroundColor Yellow
}
