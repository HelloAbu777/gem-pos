const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🍽 Test taomlarni qo\'shish...');

  const dishes = [
    { name: 'Palov', price: 25000, barcode: '4870022003305', isActive: true },
    { name: 'Shashlik', price: 30000, barcode: '4870022003312', isActive: true },
    { name: 'Lag\'mon', price: 20000, barcode: '4870022003329', isActive: true },
    { name: 'Manti', price: 18000, barcode: '4870022003336', isActive: true },
    { name: 'Somsa', price: 5000, barcode: '4870022003343', isActive: true },
  ];

  for (const dish of dishes) {
    const existing = await prisma.dish.findFirst({
      where: { barcode: dish.barcode }
    });

    if (existing) {
      console.log(`⚠️  ${dish.name} allaqachon mavjud`);
    } else {
      await prisma.dish.create({ data: dish });
      console.log(`✅ ${dish.name} qo'shildi`);
    }
  }

  console.log('✅ Taomlar qo\'shildi!');
}

main()
  .catch((e) => {
    console.error('Xatolik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
