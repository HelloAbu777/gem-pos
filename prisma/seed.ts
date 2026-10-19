import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Asosiy filial (mavjud bo'lsa saqlanadi, tegilmaydi)
  const branch = await prisma.branch.upsert({
    where: { id: 'default-branch' },
    update: {},
    create: {
      id: 'default-branch',
      name: 'Asosiy filial',
      address: 'Toshkent shahri',
    },
  })
  console.log('✅ Filial:', branch.name)

  // 2. Oddiy admin (mavjud bo'lsa saqlanadi)
  const adminHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      name: 'Administrator',
      login: 'admin',
      password: adminHash,
      role: 'ADMIN',
      branchId: branch.id,
    },
  })
  console.log('✅ Admin:', admin.login)

  // 3. Super Admin (login: gem, parol: gem*94*)
  const superHash = await bcrypt.hash('gem*94*', 10)
  const superAdmin = await prisma.user.upsert({
    where: { login: 'gem' },
    update: {},
    create: {
      name: 'Super Admin',
      login: 'gem',
      password: superHash,
      role: 'SUPER_ADMIN',
      branchId: null, // Super Admin biror filiallga bog'liq emas
    },
  })
  console.log('✅ Super Admin:', superAdmin.login, '(parol: gem*94*)')

  console.log('🎉 Seeding tugadi!')
}

main()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect() })
