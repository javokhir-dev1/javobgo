-- Email + parol orqali ro'yxatdan o'tish uchun telegram_users jadvaliga ustunlar qo'shish.
--
-- NEGA QO'LDA: app.module.ts da synchronize faqat NODE_ENV !== 'production' da yoqiladi.
-- Production serverda TypeORM sxemani o'zgartirmaydi, shuning uchun bu skriptni
-- deploy qilishdan OLDIN bir marta ishga tushirish kerak.
--
-- Ishga tushirish:
--   psql -U postgres -d instabot -f backend/migrations/2026-08-01-email-auth.sql
--
-- Skript idempotent — bir necha marta ishga tushirsa ham xato bermaydi.

BEGIN;

-- Hisob qanday ochilgani. Mavjud yozuvlarning hammasi Telegram orqali kelgan.
ALTER TABLE telegram_users
  ADD COLUMN IF NOT EXISTS auth_type varchar NOT NULL DEFAULT 'telegram';

-- Faqat auth_type='email' bo'lganda to'ladi.
ALTER TABLE telegram_users
  ADD COLUMN IF NOT EXISTS email varchar;

-- scrypt hash: scrypt$N$r$p$<salt-base64>$<hash-base64>
ALTER TABLE telegram_users
  ADD COLUMN IF NOT EXISTS password_hash varchar;

-- Bir email — bitta hisob. Postgres unique indeksi bir nechta NULL ga ruxsat beradi,
-- shuning uchun email'i yo'q Telegram foydalanuvchilari cheklovga tushmaydi.
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_telegram_users_email"
  ON telegram_users (email);

COMMIT;
