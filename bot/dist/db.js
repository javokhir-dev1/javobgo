"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.upsertTelegramUser = upsertTelegramUser;
exports.getUserLanguage = getUserLanguage;
exports.updateUserLanguage = updateUserLanguage;
exports.isUserRegistered = isUserRegistered;
exports.getActiveAuthToken = getActiveAuthToken;
exports.createAuthToken = createAuthToken;
exports.setTokenMessageId = setTokenMessageId;
exports.createSupportRequest = createSupportRequest;
exports.getAdminTelegramIds = getAdminTelegramIds;
exports.resolveSupportRequest = resolveSupportRequest;
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
async function upsertTelegramUser(telegramId, firstName, username, phone, avatarUrl, language) {
    await exports.pool.query(`INSERT INTO telegram_users (telegram_id, first_name, username, phone_number, avatar_url, language)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (telegram_id)
     DO UPDATE SET
       first_name   = EXCLUDED.first_name,
       username     = EXCLUDED.username,
       phone_number = COALESCE(EXCLUDED.phone_number, telegram_users.phone_number),
       avatar_url   = COALESCE(telegram_users.avatar_url, EXCLUDED.avatar_url),
       language     = COALESCE(EXCLUDED.language, telegram_users.language)`, [telegramId, firstName, username, phone ?? null, avatarUrl ?? null, language ?? 'uz']);
}
async function getUserLanguage(telegramId) {
    const res = await exports.pool.query(`SELECT language FROM telegram_users WHERE telegram_id = $1`, [telegramId]);
    if ((res.rowCount ?? 0) > 0 && res.rows[0].language) {
        return res.rows[0].language;
    }
    return 'uz';
}
async function updateUserLanguage(telegramId, language) {
    await exports.pool.query(`UPDATE telegram_users SET language = $1 WHERE telegram_id = $2`, [language, telegramId]);
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
/** Token qaysi xabarga biriktirilganligini saqlash (edit qilish uchun) */
async function setTokenMessageId(token, messageId) {
    await exports.pool.query(`UPDATE auth_tokens SET message_id = $1 WHERE token = $2`, [messageId, token]);
}
/** Murojaat (support request) saqlash — yaratilgan yozuv id sini qaytaradi */
async function createSupportRequest(telegramId, fromName, message, type = 'general') {
    const res = await exports.pool.query(`INSERT INTO support_requests (telegram_id, from_name, message, type, status)
     VALUES ($1, $2, $3, $4, 'new')
     RETURNING id`, [telegramId, fromName, message.slice(0, 4000), type]);
    return res.rows[0].id;
}
/** Admin (role='admin') foydalanuvchilarning telegram_id larini olish */
async function getAdminTelegramIds() {
    const res = await exports.pool.query(`SELECT telegram_id FROM telegram_users WHERE role = 'admin'`);
    return res.rows.map((r) => String(r.telegram_id));
}
/** Murojaatni hal qilindi deb belgilash */
async function resolveSupportRequest(id) {
    await exports.pool.query(`UPDATE support_requests SET status = 'resolved', resolved_at = NOW() WHERE id = $1`, [id]);
}
