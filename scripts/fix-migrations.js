/**
 * Bu script Vercel deploy paytida failed migration larni tozalaydi.
 * P3009 xatosini hal qiladi.
 */
const { execSync } = require('child_process');

function run(cmd) {
  try {
    const out = execSync(cmd, { stdio: 'pipe' }).toString();
    console.log(`✅ ${cmd}\n${out}`);
    return true;
  } catch (e) {
    const msg = e.stderr?.toString() || e.message;
    console.log(`⚠️  ${cmd} => ${msg}`);
    return false;
  }
}

console.log('🔧 Fixing failed migrations...');

// Failed migration larni --applied deb belgilash
// Agar allaqachon applied bo'lsa xato bermaydi, shunchaki o'tib ketadi
run('npx prisma migrate resolve --applied 20260829073257_add_dishes_model');
run('npx prisma migrate resolve --applied 20260829090316_add_legal_entity_and_sale_type');

console.log('🚀 Running prisma migrate deploy...');
run('npx prisma migrate deploy');

console.log('✅ Done!');
