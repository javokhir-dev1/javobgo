"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const crypto_1 = require("crypto");
const telegraf_1 = require("telegraf");
const db_1 = require("./db");
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const AVATARS_DIR = process.env.AVATARS_UPLOAD_DIR
    || path.join(__dirname, '..', '..', 'backend', 'uploads', 'avatars');
if (!BOT_TOKEN)
    throw new Error('TELEGRAM_BOT_TOKEN .env faylida topilmadi!');
const bot = new telegraf_1.Telegraf(BOT_TOKEN);
// ─── Avatar yuklab olish ──────────────────────────────────────────────────────
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(dest);
        proto.get(url, (res) => {
            if (res.statusCode !== 200) {
                file.close();
                fs.unlink(dest, () => { });
                return reject(new Error('HTTP ' + res.statusCode));
            }
            res.pipe(file);
            file.on('finish', () => file.close(() => resolve()));
            file.on('error', (e) => { fs.unlink(dest, () => { }); reject(e); });
        }).on('error', reject);
    });
}
async function fetchAndSaveAvatar(userId) {
    try {
        const photos = await bot.telegram.getUserProfilePhotos(userId, 0, 1);
        if (!photos.total_count)
            return null;
        const largest = photos.photos[0].at(-1);
        const fileInfo = await bot.telegram.getFile(largest.file_id);
        if (!fileInfo.file_path)
            return null;
        const tgFileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
        const ext = fileInfo.file_path.split('.').pop() || 'jpg';
        const filename = (0, crypto_1.randomUUID)() + '.' + ext;
        fs.mkdirSync(AVATARS_DIR, { recursive: true });
        await downloadFile(tgFileUrl, path.join(AVATARS_DIR, filename));
        return `${BACKEND_URL}/uploads/avatars/${filename}`;
    }
    catch (e) {
        console.warn('Avatar olishda xato (muhim emas):', e.message);
        return null;
    }
}
// ─── /start ───────────────────────────────────────────────────────────────────
bot.command('start', async (ctx) => {
    const from = ctx.from;
    if (!from)
        return;
    const registered = await (0, db_1.isUserRegistered)(String(from.id)).catch(() => false);
    if (registered) {
        await ctx.replyWithMarkdown(`Salom, *${from.first_name}*! Kirish kodini olish uchun /login yuboring.`);
        return;
    }
    await ctx.replyWithMarkdown(`*Xush kelibsiz, ${from.first_name}!* 👋\n\n` +
        `Instagram avtomat bot tizimiga kirish uchun telefon raqamingizni ulashing:`, {
        reply_markup: {
            keyboard: [[{ text: '📱 Telefon raqamimni ulashish', request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
        },
    });
});
// ─── Telefon raqami ───────────────────────────────────────────────────────────
bot.on('contact', async (ctx) => {
    const from = ctx.from;
    const contact = ctx.message?.contact;
    if (!from || !contact)
        return;
    if (contact.user_id && contact.user_id !== from.id) {
        await ctx.reply("Iltimos, o'z telefon raqamingizni ulashing.", {
            reply_markup: { remove_keyboard: true },
        });
        return;
    }
    const telegramId = String(from.id);
    const firstName = from.first_name || 'Foydalanuvchi';
    const username = from.username ?? null;
    const phone = contact.phone_number;
    try {
        const avatarUrl = await fetchAndSaveAvatar(from.id);
        await (0, db_1.upsertTelegramUser)(telegramId, firstName, username, phone, avatarUrl);
        const token = await (0, db_1.createAuthToken)(telegramId);
        const loginUrl = `${SITE_URL}/login?token=${token}`;
        await ctx.replyWithMarkdown(`✅ *Ro'yxatdan o'tdingiz!*\n\nPlatformaga kirish uchun quyidagi tugmalardan birini tanlang:`, {
            reply_markup: {
                inline_keyboard: [[
                        { text: '🌐 Brauzerda ochish', url: loginUrl },
                        { text: '📱 Web App orqali', web_app: { url: loginUrl } },
                    ]],
            },
        });
    }
    catch (err) {
        console.error('Contact xatosi:', err.message);
        await ctx.reply("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.", {
            reply_markup: { remove_keyboard: true },
        });
    }
});
// ─── /login ───────────────────────────────────────────────────────────────────
bot.command('login', async (ctx) => {
    const from = ctx.from;
    if (!from)
        return;
    const telegramId = String(from.id);
    try {
        const registered = await (0, db_1.isUserRegistered)(telegramId);
        if (!registered) {
            await ctx.reply("Siz hali ro'yxatdan o'tmagansiz. /start komandasini yuboring.");
            return;
        }
        const activeToken = await (0, db_1.getActiveAuthToken)(telegramId);
        let token = activeToken;
        if (!token) {
            token = await (0, db_1.createAuthToken)(telegramId);
        }
        const loginUrl = `${SITE_URL}/login?token=${token}`;
        await ctx.replyWithMarkdown(`🔑 *Tizimga kirish*\n\nPlatformaga kirish uchun quyidagi tugmalardan birini tanlang:`, {
            reply_markup: {
                inline_keyboard: [[
                        { text: '🌐 Brauzerda ochish', url: loginUrl },
                        { text: '📱 Web App orqali', web_app: { url: loginUrl } },
                    ]],
            },
        });
    }
    catch (err) {
        console.error('/login xatosi:', err.message);
        await ctx.reply("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
    }
});
// ─── /help ────────────────────────────────────────────────────────────────────
bot.command('help', async (ctx) => {
    await ctx.replyWithMarkdown(`*Avto Komment Bot — yordam*\n\n` +
        `🔹 /start — Ro'yxatdan o'tish yoki xush kelibsiz xabari\n` +
        `🔹 /login — Saytga kirish uchun maxsus havola olish\n` +
        `🔹 /help  — Ushbu yordam xabari`);
});
// ─── Noma'lum xabarlar ────────────────────────────────────────────────────────
bot.on('message', async (ctx) => {
    await ctx.reply("Buyruqni tushunmadim. /help yuboring.");
});
// ─── Start ────────────────────────────────────────────────────────────────────
async function main() {
    await bot.launch({ dropPendingUpdates: true });
    console.log('✅ Avto Komment Bot ishga tushdi');
}
main().catch((err) => {
    console.error('Bot ishga tushmadi:', err.message);
    process.exit(1);
});
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
