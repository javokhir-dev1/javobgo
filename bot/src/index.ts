import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { randomUUID } from 'crypto';
import { Telegraf, Context, Markup } from 'telegraf';
import {
  upsertTelegramUser, isUserRegistered, createAuthToken, getActiveAuthToken, setTokenMessageId,
  createSupportRequest, getAdminTelegramIds, resolveSupportRequest, getUserLanguage, updateUserLanguage
} from './db';
import { t, Language } from './i18n';

const BOT_TOKEN        = process.env.TELEGRAM_BOT_TOKEN;
const SITE_URL         = process.env.SITE_URL         || 'http://localhost:3000';
const BACKEND_URL      = process.env.BACKEND_URL      || 'http://localhost:4000';
const AVATARS_DIR      = process.env.AVATARS_UPLOAD_DIR
  || path.join(__dirname, '..', '..', 'backend', 'uploads', 'avatars');

if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN .env faylida topilmadi!');

const bot = new Telegraf(BOT_TOKEN);

// Murojaat va til tanlash uchun vaqtinchalik xotira
const pendingSupport = new Map<number, 'general' | 'data_deletion'>();
const pendingLanguage = new Map<number, Language>();

// Doimiy tugmalarni tilga qarab shakllantirish uchun funksiya
function getMainKeyboard(lang: Language) {
  return Markup.keyboard([
    [t(lang, 'support_btn'), t(lang, 'change_lang_btn')]
  ]).resize();
}

// ─── Avatar yuklab olish ──────────────────────────────────────────────────────

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(url, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error('HTTP ' + res.statusCode));
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', (e) => { fs.unlink(dest, () => {}); reject(e); });
    }).on('error', reject);
  });
}

async function fetchAndSaveAvatar(userId: number): Promise<string | null> {
  try {
    const photos = await bot.telegram.getUserProfilePhotos(userId, 0, 1);
    if (!photos.total_count) return null;

    const largest = photos.photos[0].at(-1)!;
    const fileInfo = await bot.telegram.getFile(largest.file_id);
    if (!fileInfo.file_path) return null;

    const tgFileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
    const ext = fileInfo.file_path.split('.').pop() || 'jpg';
    const filename = randomUUID() + '.' + ext;

    fs.mkdirSync(AVATARS_DIR, { recursive: true });
    await downloadFile(tgFileUrl, path.join(AVATARS_DIR, filename));

    return `${BACKEND_URL}/uploads/avatars/${filename}`;
  } catch (e: any) {
    console.warn('Avatar olishda xato (muhim emas):', e.message);
    return null;
  }
}

// ─── /start ───────────────────────────────────────────────────────────────────

bot.command('start', async (ctx: Context) => {
  const from = ctx.from;
  if (!from) return;

  const payload = (ctx as any).payload || (ctx.message as any)?.text?.split(' ')[1];
  if (payload === 'murojaat') {
    return askMurojaat(ctx);
  }

  const registered = await isUserRegistered(String(from.id)).catch(() => false);
  const lang = registered ? await getUserLanguage(String(from.id)) as Language : 'uz';

  if (registered) {
    const token = await createAuthToken(String(from.id));
    const loginUrl = `${SITE_URL}/login?token=${token}`;
    const sentMsg = await ctx.replyWithMarkdown(
      t(lang, 'login_greeting', from.first_name),
      {
        reply_markup: {
          inline_keyboard: [[
            { text: t(lang, 'open_browser'), url: loginUrl },
            { text: t(lang, 'open_webapp'), web_app: { url: `${SITE_URL}/login` } },
          ]],
        },
      },
    );
    await setTokenMessageId(token, sentMsg.message_id);

    // Asosiy tugmalarni ko'rsatish
    await ctx.reply(t(lang, 'main_menu'), getMainKeyboard(lang));
    return;
  }

  // Not registered - ask for language
  await ctx.reply(
    t('uz', 'choose_language'),
    Markup.inlineKeyboard([
      [Markup.button.callback("🇺🇿 O'zbekcha", "lang_uz")],
      [Markup.button.callback("🇷🇺 Русский", "lang_ru")],
      [Markup.button.callback("🇬🇧 English", "lang_en")]
    ])
  );
});

// ─── Til tanlash ──────────────────────────────────────────────────────────────

bot.action(/^lang_(uz|ru|en)$/, async (ctx: Context) => {
  const from = ctx.from;
  if (!from) return;
  const lang = ((ctx as any).match as RegExpMatchArray)[1] as Language;
  
  // Save in temporary map (since they might not be registered yet)
  pendingLanguage.set(from.id, lang);
  
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  
  const registered = await isUserRegistered(String(from.id)).catch(() => false);
  if (registered) {
    // Shunchaki til o'zgartirildi
    await updateUserLanguage(String(from.id), lang);
    await ctx.reply(t(lang, 'language_updated'), getMainKeyboard(lang));
  } else {
    // Yangi user uchun kontakt so'rash
    await ctx.replyWithMarkdown(
      t(lang, 'welcome', from.first_name),
      {
        reply_markup: {
          keyboard: [[{ text: t(lang, 'share_contact'), request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      },
    );
  }
});

// ─── Telefon raqami ───────────────────────────────────────────────────────────

bot.on('contact', async (ctx: Context) => {
  const from    = ctx.from;
  const contact = (ctx.message as any)?.contact;
  if (!from || !contact) return;

  const lang = pendingLanguage.get(from.id) || 'uz';

  if (contact.user_id && contact.user_id !== from.id) {
    await ctx.reply(t(lang, 'please_share_own_contact'), {
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  const telegramId = String(from.id);
  const firstName  = from.first_name || 'Foydalanuvchi';
  const username   = from.username ?? null;
  const phone      = contact.phone_number as string;

  try {
    const avatarUrl = await fetchAndSaveAvatar(from.id);
    await upsertTelegramUser(telegramId, firstName, username, phone, avatarUrl, lang);
    pendingLanguage.delete(from.id);

    const token = await createAuthToken(telegramId);
    const loginUrl = `${SITE_URL}/login?token=${token}`;

    const sentMsg = await ctx.replyWithMarkdown(
      t(lang, 'registered_success'),
      {
        reply_markup: {
          inline_keyboard: [[
            { text: t(lang, 'open_browser'), url: loginUrl },
            { text: t(lang, 'open_webapp'), web_app: { url: `${SITE_URL}/login` } },
          ]],
        },
      },
    );
    await setTokenMessageId(token, sentMsg.message_id);

    await ctx.reply(t(lang, 'main_menu'), getMainKeyboard(lang));

  } catch (err: any) {
    console.error('Contact xatosi:', err.message);
    await ctx.reply(t(lang, 'error_occurred'), {
      reply_markup: { remove_keyboard: true },
    });
  }
});

// ─── /help ────────────────────────────────────────────────────────────────────

bot.command('help', async (ctx: Context) => {
  const from = ctx.from;
  if (!from) return;
  const lang = await getUserLanguage(String(from.id)).catch(() => 'uz') as Language;
  await ctx.replyWithMarkdown(t(lang, 'help_text'), getMainKeyboard(lang));
});

// ─── /murojaat — admin bilan bog'lanish ─────────────────────────────────────────

async function askMurojaat(ctx: Context) {
  const from = ctx.from;
  if (!from) return;
  const lang = await getUserLanguage(String(from.id)).catch(() => 'uz') as Language;
  pendingSupport.set(from.id, 'general');
  await ctx.replyWithMarkdown(t(lang, 'ask_support'));
}

bot.command('murojaat', (ctx) => askMurojaat(ctx));

async function forwardToAdmins(requestId: number, fromName: string, telegramId: string, message: string) {
  const adminIds = await getAdminTelegramIds();
  const text =
    `✉️ <b>Yangi murojaat #${requestId}</b>\n\n` +
    `<b>Kimdan:</b> <a href="tg://user?id=${telegramId}">${escapeHtml(fromName)}</a>\n` +
    `<b>Telegram ID:</b> <code>${telegramId}</code>\n\n` +
    escapeHtml(message);
  const keyboard = Markup.inlineKeyboard([
    Markup.button.callback('✅ Hal qilindi', `resolve:${requestId}`),
  ]);
  for (const adminId of adminIds) {
    try {
      await bot.telegram.sendMessage(adminId, text, { parse_mode: 'HTML', ...keyboard });
    } catch (e: any) {
      console.warn(`Adminga yuborilmadi (${adminId}):`, e.message);
    }
  }
  return adminIds.length;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Admin "Hal qilindi" tugmasini bosganda
bot.action(/^resolve:(\d+)$/, async (ctx) => {
  const fromId = ctx.from?.id ? String(ctx.from.id) : '';
  const admins = await getAdminTelegramIds();
  if (!admins.includes(fromId)) {
    await ctx.answerCbQuery("Ruxsat yo'q");
    return;
  }
  const id = Number(((ctx as any).match as RegExpMatchArray)[1]);
  try {
    await resolveSupportRequest(id);
    await ctx.answerCbQuery('Hal qilindi deb belgilandi ✅');
    const original = (ctx.callbackQuery.message as any)?.text || '';
    await ctx.editMessageText(`${original}\n\n✅ <b>Hal qilindi</b>`, { parse_mode: 'HTML' });
  } catch (e: any) {
    await ctx.answerCbQuery('Xatolik yuz berdi');
    console.error('resolve xato:', e.message);
  }
});

// ─── Matnli xabarlar (murojaat, til almashtirish yoki noma'lum buyruq) ─────────

bot.on('message', async (ctx: Context) => {
  const from = ctx.from;
  const text = (ctx.message as any)?.text as string | undefined;

  if (!from || !text) return;

  const lang = await getUserLanguage(String(from.id)).catch(() => 'uz') as Language;

  // Pastki "Murojaat" tugmasi bosilganda
  if (text === t(lang, 'support_btn') || text === '✍️ Murojaat' || text === '✍️ Обращение' || text === '✍️ Support') {
    await askMurojaat(ctx);
    return;
  }

  // Pastki "Tilni o'zgartirish" tugmasi bosilganda
  if (text === t(lang, 'change_lang_btn') || text === "🌍 Tilni o'zgartirish" || text === "🌍 Изменить язык" || text === "🌍 Change Language") {
    await ctx.reply(
      t(lang, 'choose_language'),
      Markup.inlineKeyboard([
        [Markup.button.callback("🇺🇿 O'zbekcha", "lang_uz")],
        [Markup.button.callback("🇷🇺 Русский", "lang_ru")],
        [Markup.button.callback("🇬🇧 English", "lang_en")]
      ])
    );
    return;
  }

  if (pendingSupport.has(from.id)) {
    pendingSupport.delete(from.id);
    const fromName = `${from.first_name || 'Foydalanuvchi'}${from.username ? ' (@' + from.username + ')' : ''}`;
    try {
      const requestId = await createSupportRequest(String(from.id), fromName, text, 'general');
      const adminCount = await forwardToAdmins(requestId, fromName, String(from.id), text);
      if (adminCount > 0) {
        // Assume uz for admin notification reply is okay, or translate. We'll use user's lang for now.
        // Actually it's better to just use user's lang.
        await ctx.reply(lang === 'uz' ? '✅ Murojaatingiz adminga yuborildi. Tez orada javob beriladi.' :
                        lang === 'ru' ? '✅ Ваше обращение отправлено админу. Скоро мы ответим.' :
                                        '✅ Your message has been sent to the admin. We will reply soon.');
      } else {
        await ctx.reply(lang === 'uz' ? '✅ Murojaatingiz qabul qilindi.' :
                        lang === 'ru' ? '✅ Ваше обращение принято.' :
                                        '✅ Your message has been received.');
      }
    } catch (e: any) {
      console.error('Murojaat saqlashda xato:', e.message);
      await ctx.reply(t(lang, 'error_occurred'));
    }
    return;
  }

  await ctx.reply(
    lang === 'uz' ? "Buyruqni tushunmadim. /help yuboring." :
    lang === 'ru' ? "Неизвестная команда. Отправьте /help." :
                    "Command not understood. Send /help."
  );
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  await bot.launch({ dropPendingUpdates: true });
  console.log('✅ JavobGo boti ishga tushdi');
}

main().catch((err) => {
  console.error('Bot ishga tushmadi:', err.message);
  process.exit(1);
});

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
