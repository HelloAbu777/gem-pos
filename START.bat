@echo off
echo ============================================
echo GEM POS - Avtomatik Ishga Tushirish
echo ============================================
echo.

cd /d "%~dp0"

echo [1/5] Dependencies o'rnatilmoqda...
call pnpm install
if errorlevel 1 (
    echo XATO: pnpm topilmadi, npm ishlatiladi...
    call npm install
)

echo.
echo [2/5] Prisma Client generatsiya qilinmoqda...
call npx prisma generate

echo.
echo [3/5] Database migration...
call npx prisma db push

echo.
echo [4/5] Seed data (admin yaratish)...
call npx tsx prisma/seed.ts

echo.
echo [5/5] Server ishga tushirilmoqda...
echo.
echo ============================================
echo Brauzerda oching: http://localhost:3000
echo Login: admin
echo Parol: admin123
echo ============================================
echo.

call npm run dev

pause
