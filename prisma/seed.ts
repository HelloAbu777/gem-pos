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
      id:      'default-branch',
      name:    'Asosiy filial',
      address: 'Toshkent shahri',
    },
  })
  console.log('✅ Filial:', branch.name)

  // 2. Oddiy admin (mavjud bo'lsa saqlanadi)
  const adminHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where:  { login: 'admin' },
    update: {},
    create: {
      name:     'Administrator',
      login:    'admin',
      password: adminHash,
      role:     'ADMIN',
      branchId: branch.id,
    },
  })
  console.log('✅ Admin:', admin.login)

  // 3. Super Admin — branchId=NULL, raw SQL ishlatiladi (Prisma type limitation)
  const superHash = await bcrypt.hash('gem*94*', 10)
  await prisma.$executeRaw`
    INSERT INTO "users" ("id", "name", "login", "password", "role", "branchId", "updatedAt")
    VALUES (
      'super-admin-gem',
      'Super Admin',
      'gem',
      ${superHash},
      'SUPER_ADMIN',
      NULL,
      NOW()
    )
    ON CONFLICT ("login") DO UPDATE
      SET "role" = 'SUPER_ADMIN', "branchId" = NULL, "updatedAt" = NOW()
  `
  console.log('✅ Super Admin yaratildi (login: gem, parol: gem*94*)')

  console.log('🎉 Seeding tugadi!')
}

main()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect() })
