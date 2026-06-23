import { Pool } from 'pg';
import { randomUUID } from 'crypto';

export const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  user:     process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'instabot',
});

pool.on('error', (err) => {
  console.error('PostgreSQL ulanish xatosi:', err.message);
});

/** Foydalanuvchini qo'shish yoki yangilash */
export async function upsertTelegramUser(
  telegramId: string,
  firstName: string,
  username: string | null,
  phone?: string,
  avatarUrl?: string | null,
): Promise<void> {
  await pool.query(
    `INSERT INTO telegram_users (telegram_id, first_name, username, phone_number, avatar_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (telegram_id)
     DO UPDATE SET
       first_name   = EXCLUDED.first_name,
       username     = EXCLUDED.username,
       phone_number = COALESCE(EXCLUDED.phone_number, telegram_users.phone_number),
       avatar_url   = COALESCE(telegram_users.avatar_url, EXCLUDED.avatar_url)`,
    [telegramId, firstName, username, phone ?? null, avatarUrl ?? null],
  );
}

/** Foydalanuvchi ro'yxatdan o'tganligini tekshirish */
export async function isUserRegistered(telegramId: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM telegram_users WHERE telegram_id = $1 AND phone_number IS NOT NULL`,
    [telegramId],
  );
  return (res.rowCount ?? 0) > 0;
}

/** Hali muddati o'tmagan tokenni olish */
export async function getActiveAuthToken(telegramId: string): Promise<string | null> {
  const res = await pool.query(
    `SELECT token FROM auth_tokens
     WHERE telegram_id = $1 AND is_used = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [telegramId],
  );
  return (res.rowCount ?? 0) > 0 ? res.rows[0].token : null;
}

/** Yangi token yaratish (eskisini o'chirib) */
export async function createAuthToken(telegramId: string): Promise<string> {
  await pool.query(
    `DELETE FROM auth_tokens WHERE telegram_id = $1 AND is_used = false`,
    [telegramId],
  );

  let token: string;
  let exists: boolean;
  do {
    token = randomUUID();
    const res = await pool.query(
      `SELECT 1 FROM auth_tokens WHERE token = $1 AND is_used = false AND expires_at > NOW()`,
      [token],
    );
    exists = (res.rowCount ?? 0) > 0;
  } while (exists);

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 daqiqa
  await pool.query(
    `INSERT INTO auth_tokens (telegram_id, token, is_used, expires_at) VALUES ($1, $2, false, $3)`,
    [telegramId, token, expiresAt],
  );

  return token;
}
