-- Super Admin roli uchun branchId optional qilish
-- SUPER_ADMIN foydalanuvchilari hech bir filiallga bog'liq bo'lmaydi (branchId = NULL)

-- branchId ni nullable (optional) qilish
ALTER TABLE "users" ALTER COLUMN "branchId" DROP NOT NULL;
