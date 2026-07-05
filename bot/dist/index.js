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
const i18n_1 = require("./i18n");
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const AVATARS_DIR = process.env.AVATARS_UPLOAD_DIR
    || path.join(__dirname, '..', '..', 'backend', 'uploads', 'avatars');
if (!BOT_TOKEN)
    throw new Error('TELEGRAM_BOT_TOKEN .env faylida topilmadi!');
const bot = new telegraf_1.Telegraf(BOT_TOKEN);
// Murojaat va til tanlash uchun vaqtinchalik xotira
const pendingSupport = new Map();
const pendingLanguage = new Map();
// Doimiy tugmalarni tilga qarab shakllantirish uchun funksiya
function getMainKeyboard(lang) {
    return telegraf_1.Markup.keyboard([
        [(0, i18n_1.t)(lang, 'support_btn'), (0, i18n_1.t)(lang, 'change_lang_btn')]
    ]).resize();
}
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
    const payload = ctx.payload || ctx.message?.text?.split(' ')[1];
    if (payload === 'murojaat') {
        return askMurojaat(ctx);
    }
    const registered = await (0, db_1.isUserRegistered)(String(from.id)).catch(() => false);
    const lang = registered ? await (0, db_1.getUserLanguage)(String(from.id)) : 'uz';
    if (registered) {
        const token = await (0, db_1.createAuthToken)(String(from.id));
        const loginUrl = `${SITE_URL}/login?token=${token}`;
        const sentMsg = await ctx.replyWithMarkdown((0, i18n_1.t)(lang, 'login_greeting', from.first_name), {
            reply_markup: {
                inline_keyboard: [[
                        { text: (0, i18n_1.t)(lang, 'open_browser'), url: loginUrl },
                        { text: (0, i18n_1.t)(lang, 'open_webapp'), web_app: { url: `${SITE_URL}/login` } },
                    ]],
            },
        });
        await (0, db_1.setTokenMessageId)(token, sentMsg.message_id);
        // Asosiy tugmalarni ko'rsatish
        await ctx.reply((0, i18n_1.t)(lang, 'main_menu'), getMainKeyboard(lang));
        return;
    }
    // Not registered - ask for language
    await ctx.reply((0, i18n_1.t)('uz', 'choose_language'), telegraf_1.Markup.inlineKeyboard([
        [telegraf_1.Markup.button.callback("🇺🇿 O'zbekcha", "lang_uz")],
        [telegraf_1.Markup.button.callback("🇷🇺 Русский", "lang_ru")],
        [telegraf_1.Markup.button.callback("🇬🇧 English", "lang_en")]
    ]));
});
// ─── Til tanlash ──────────────────────────────────────────────────────────────
bot.action(/^lang_(uz|ru|en)$/, async (ctx) => {
    const from = ctx.from;
    if (!from)
        return;
    const lang = ctx.match[1];
    // Save in temporary map (since they might not be registered yet)
    pendingLanguage.set(from.id, lang);
    await ctx.answerCbQuery();
    await ctx.deleteMessage().catch(() => { });
    const registered = await (0, db_1.isUserRegistered)(String(from.id)).catch(() => false);
    if (registered) {
        // Shunchaki til o'zgartirildi
        await (0, db_1.updateUserLanguage)(String(from.id), lang);
        await ctx.reply((0, i18n_1.t)(lang, 'language_updated'), getMainKeyboard(lang));
    }
    else {
        // Yangi user uchun kontakt so'rash
        await ctx.replyWithMarkdown((0, i18n_1.t)(lang, 'welcome', from.first_name), {
            reply_markup: {
                keyboard: [[{ text: (0, i18n_1.t)(lang, 'share_contact'), request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        });
    }
});
// ─── Telefon raqami ───────────────────────────────────────────────────────────
bot.on('contact', async (ctx) => {
    const from = ctx.from;
    const contact = ctx.message?.contact;
    if (!from || !contact)
        return;
    const lang = pendingLanguage.get(from.id) || 'uz';
    if (contact.user_id && contact.user_id !== from.id) {
        await ctx.reply((0, i18n_1.t)(lang, 'please_share_own_contact'), {
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
        await (0, db_1.upsertTelegramUser)(telegramId, firstName, username, phone, avatarUrl, lang);
        pendingLanguage.delete(from.id);
        const token = await (0, db_1.createAuthToken)(telegramId);
        const loginUrl = `${SITE_URL}/login?token=${token}`;
        const sentMsg = await ctx.replyWithMarkdown((0, i18n_1.t)(lang, 'registered_success'), {
            reply_markup: {
                inline_keyboard: [[
                        { text: (0, i18n_1.t)(lang, 'open_browser'), url: loginUrl },
                        { text: (0, i18n_1.t)(lang, 'open_webapp'), web_app: { url: `${SITE_URL}/login` } },
                    ]],
            },
        });
        await (0, db_1.setTokenMessageId)(token, sentMsg.message_id);
        await ctx.reply((0, i18n_1.t)(lang, 'main_menu'), getMainKeyboard(lang));
    }
    catch (err) {
        console.error('Contact xatosi:', err.message);
        await ctx.reply((0, i18n_1.t)(lang, 'error_occurred'), {
            reply_markup: { remove_keyboard: true },
        });
    }
});
// ─── /help ────────────────────────────────────────────────────────────────────
bot.command('help', async (ctx) => {
    const from = ctx.from;
    if (!from)
        return;
    const lang = await (0, db_1.getUserLanguage)(String(from.id)).catch(() => 'uz');
    await ctx.replyWithMarkdown((0, i18n_1.t)(lang, 'help_text'), getMainKeyboard(lang));
});
// ─── /murojaat — admin bilan bog'lanish ─────────────────────────────────────────
async function askMurojaat(ctx) {
    const from = ctx.from;
    if (!from)
        return;
    const lang = await (0, db_1.getUserLanguage)(String(from.id)).catch(() => 'uz');
    pendingSupport.set(from.id, 'general');
    await ctx.replyWithMarkdown((0, i18n_1.t)(lang, 'ask_support'));
}
bot.command('murojaat', (ctx) => askMurojaat(ctx));
async function forwardToAdmins(requestId, fromName, telegramId, message) {
    const adminIds = await (0, db_1.getAdminTelegramIds)();
    const text = `✉️ <b>Yangi murojaat #${requestId}</b>\n\n` +
        `<b>Kimdan:</b> <a href="tg://user?id=${telegramId}">${escapeHtml(fromName)}</a>\n` +
        `<b>Telegram ID:</b> <code>${telegramId}</code>\n\n` +
        escapeHtml(message);
    const keyboard = telegraf_1.Markup.inlineKeyboard([
        telegraf_1.Markup.button.callback('✅ Hal qilindi', `resolve:${requestId}`),
    ]);
    for (const adminId of adminIds) {
        try {
            await bot.telegram.sendMessage(adminId, text, { parse_mode: 'HTML', ...keyboard });
        }
        catch (e) {
            console.warn(`Adminga yuborilmadi (${adminId}):`, e.message);
        }
    }
    return adminIds.length;
}
function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// Admin "Hal qilindi" tugmasini bosganda
bot.action(/^resolve:(\d+)$/, async (ctx) => {
    const fromId = ctx.from?.id ? String(ctx.from.id) : '';
    const admins = await (0, db_1.getAdminTelegramIds)();
    if (!admins.includes(fromId)) {
        await ctx.answerCbQuery("Ruxsat yo'q");
        return;
    }
    const id = Number(ctx.match[1]);
    try {
        await (0, db_1.resolveSupportRequest)(id);
        await ctx.answerCbQuery('Hal qilindi deb belgilandi ✅');
        const original = ctx.callbackQuery.message?.text || '';
        await ctx.editMessageText(`${original}\n\n✅ <b>Hal qilindi</b>`, { parse_mode: 'HTML' });
    }
    catch (e) {
        await ctx.answerCbQuery('Xatolik yuz berdi');
        console.error('resolve xato:', e.message);
    }
});
// ─── Matnli xabarlar (murojaat, til almashtirish yoki noma'lum buyruq) ─────────
bot.on('message', async (ctx) => {
    const from = ctx.from;
    const text = ctx.message?.text;
    if (!from || !text)
        return;
    const lang = await (0, db_1.getUserLanguage)(String(from.id)).catch(() => 'uz');
    // Pastki "Murojaat" tugmasi bosilganda
    if (text === (0, i18n_1.t)(lang, 'support_btn') || text === '✍️ Murojaat' || text === '✍️ Обращение' || text === '✍️ Support') {
        await askMurojaat(ctx);
        return;
    }
    // Pastki "Tilni o'zgartirish" tugmasi bosilganda
    if (text === (0, i18n_1.t)(lang, 'change_lang_btn') || text === "🌍 Tilni o'zgartirish" || text === "🌍 Изменить язык" || text === "🌍 Change Language") {
        await ctx.reply((0, i18n_1.t)(lang, 'choose_language'), telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback("🇺🇿 O'zbekcha", "lang_uz")],
            [telegraf_1.Markup.button.callback("🇷🇺 Русский", "lang_ru")],
            [telegraf_1.Markup.button.callback("🇬🇧 English", "lang_en")]
        ]));
        return;
    }
    if (pendingSupport.has(from.id)) {
        pendingSupport.delete(from.id);
        const fromName = `${from.first_name || 'Foydalanuvchi'}${from.username ? ' (@' + from.username + ')' : ''}`;
        try {
            const requestId = await (0, db_1.createSupportRequest)(String(from.id), fromName, text, 'general');
            const adminCount = await forwardToAdmins(requestId, fromName, String(from.id), text);
            if (adminCount > 0) {
                // Assume uz for admin notification reply is okay, or translate. We'll use user's lang for now.
                // Actually it's better to just use user's lang.
                await ctx.reply(lang === 'uz' ? '✅ Murojaatingiz adminga yuborildi. Tez orada javob beriladi.' :
                    lang === 'ru' ? '✅ Ваше обращение отправлено админу. Скоро мы ответим.' :
                        '✅ Your message has been sent to the admin. We will reply soon.');
            }
            else {
                await ctx.reply(lang === 'uz' ? '✅ Murojaatingiz qabul qilindi.' :
                    lang === 'ru' ? '✅ Ваше обращение принято.' :
                        '✅ Your message has been received.');
            }
        }
        catch (e) {
            console.error('Murojaat saqlashda xato:', e.message);
            await ctx.reply((0, i18n_1.t)(lang, 'error_occurred'));
        }
        return;
    }
    await ctx.reply(lang === 'uz' ? "Buyruqni tushunmadim. /help yuboring." :
        lang === 'ru' ? "Неизвестная команда. Отправьте /help." :
            "Command not understood. Send /help.");
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
