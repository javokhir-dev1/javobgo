"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.upsertTelegramUser = upsertTelegramUser;
exports.isUserRegistered = isUserRegistered;
exports.getActiveAuthToken = getActiveAuthToken;
exports.createAuthToken = createAuthToken;
const pg_1 = require("pg");
const crypto_1 = require("crypto");
exports.pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'instabot',
});
exports.pool.on('error', (err) => {
    console.error('PostgreSQL ulanish xatosi:', err.message);
});
/** Foydalanuvchini qo'shish yoki yangilash */
async function upsertTelegramUser(telegramId, firstName, username, phone, avatarUrl) {
    await exports.pool.query(`INSERT INTO telegram_users (telegram_id, first_name, username, phone_number, avatar_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (telegram_id)
     DO UPDATE SET
       first_name   = EXCLUDED.first_name,
       username     = EXCLUDED.username,
       phone_number = COALESCE(EXCLUDED.phone_number, telegram_users.phone_number),
       avatar_url   = COALESCE(telegram_users.avatar_url, EXCLUDED.avatar_url)`, [telegramId, firstName, username, phone ?? null, avatarUrl ?? null]);
}
/** Foydalanuvchi ro'yxatdan o'tganligini tekshirish */
async function isUserRegistered(telegramId) {
    const res = await exports.pool.query(`SELECT 1 FROM telegram_users WHERE telegram_id = $1 AND phone_number IS NOT NULL`, [telegramId]);
    return (res.rowCount ?? 0) > 0;
}
/** Hali muddati o'tmagan tokenni olish */
async function getActiveAuthToken(telegramId) {
    const res = await exports.pool.query(`SELECT token FROM auth_tokens
     WHERE telegram_id = $1 AND is_used = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`, [telegramId]);
    return (res.rowCount ?? 0) > 0 ? res.rows[0].token : null;
}
/** Yangi token yaratish (eskisini o'chirib) */
async function createAuthToken(telegramId) {
    await exports.pool.query(`DELETE FROM auth_tokens WHERE telegram_id = $1 AND is_used = false`, [telegramId]);
    let token;
    let exists;
    do {
        token = (0, crypto_1.randomUUID)();
        const res = await exports.pool.query(`SELECT 1 FROM auth_tokens WHERE token = $1 AND is_used = false AND expires_at > NOW()`, [token]);
        exists = (res.rowCount ?? 0) > 0;
    } while (exists);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 daqiqa
    await exports.pool.query(`INSERT INTO auth_tokens (telegram_id, token, is_used, expires_at) VALUES ($1, $2, false, $3)`, [telegramId, token, expiresAt]);
    return token;
}
