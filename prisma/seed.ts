import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Birinchi filial yaratish
  const branch = await prisma.branch.upsert({
    where: { id: 'default-branch' },
    update: {},
    create: {
      id: 'default-branch',
      name: 'Asosiy filial',
      address: 'Toshkent shahri',
    },
  })
  console.log('✅ Filial yaratildi:', branch.name)

  // 2. Admin foydalanuvchi yaratish
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      name: 'Administrator',
      login: 'admin',
      password: hashedPassword,
      role: 'ADMIN',
      branchId: branch.id,
    },
  })
  console.log('✅ Admin yaratildi - Login: admin, Parol: admin123')

  console.log('🎉 Seeding tugadi!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
