import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { randomUUID } from 'crypto';
import { Telegraf, Context, Markup } from 'telegraf';
import {
  upsertTelegramUser, isUserRegistered, createAuthToken, getActiveAuthToken, setTokenMessageId,
  createSupportRequest, getAdminTelegramIds, resolveSupportRequest,
} from './db';

const BOT_TOKEN        = process.env.TELEGRAM_BOT_TOKEN;
const SITE_URL         = process.env.SITE_URL         || 'http://localhost:3000';
const BACKEND_URL      = process.env.BACKEND_URL      || 'http://localhost:4000';
const AVATARS_DIR      = process.env.AVATARS_UPLOAD_DIR
  || path.join(__dirname, '..', '..', 'backend', 'uploads', 'avatars');

if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN .env faylida topilmadi!');

const bot = new Telegraf(BOT_TOKEN);

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

  if (registered) {
    const token = await createAuthToken(String(from.id));
    const loginUrl = `${SITE_URL}/login?token=${token}`;
    const sentMsg = await ctx.replyWithMarkdown(
      `Salom, *${from.first_name}*!\n\nPlatformaga kirish uchun quyidagi tugmalardan birini tanlang:`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🌐 Brauzerda ochish', url: loginUrl },
            { text: '📱 Web App orqali', web_app: { url: `${SITE_URL}/login` } },
          ]],
        },
      },
    );
    await setTokenMessageId(token, sentMsg.message_id);

    return;
  }

  await ctx.replyWithMarkdown(
    `*Xush kelibsiz, ${from.first_name}!* 👋\n\n` +
    `Instagram avtomat bot tizimiga kirish uchun telefon raqamingizni ulashing:`,
    {
      reply_markup: {
        keyboard: [[{ text: '📱 Telefon raqamimni ulashish', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    },
  );
});

// ─── Telefon raqami ───────────────────────────────────────────────────────────

bot.on('contact', async (ctx: Context) => {
  const from    = ctx.from;
  const contact = (ctx.message as any)?.contact;
  if (!from || !contact) return;

  if (contact.user_id && contact.user_id !== from.id) {
    await ctx.reply("Iltimos, o'z telefon raqamingizni ulashing.", {
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
    await upsertTelegramUser(telegramId, firstName, username, phone, avatarUrl);
    const token = await createAuthToken(telegramId);
    const loginUrl = `${SITE_URL}/login?token=${token}`;

    const sentMsg = await ctx.replyWithMarkdown(
      `✅ *Ro'yxatdan o'tdingiz!*\n\nPlatformaga kirish uchun quyidagi tugmalardan birini tanlang:`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🌐 Brauzerda ochish', url: loginUrl },
            { text: '📱 Web App orqali', web_app: { url: `${SITE_URL}/login` } },
          ]],
        },
      },
    );
    await setTokenMessageId(token, sentMsg.message_id);

  } catch (err: any) {
    console.error('Contact xatosi:', err.message);
    await ctx.reply("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.", {
      reply_markup: { remove_keyboard: true },
    });
  }
});



// ─── /help ────────────────────────────────────────────────────────────────────

bot.command('help', async (ctx: Context) => {
  await ctx.replyWithMarkdown(
    `*Avto Komment Bot — yordam*\n\n` +
    `🔹 /start — Ro'yxatdan o'tish yoki platformaga kirish\n` +
    `🔹 /murojaat — Admin bilan bog'lanish yoki ma'lumot o'chirish so'rovi\n` +
    `🔹 /help  — Ushbu yordam xabari`,
  );
});

// ─── /murojaat — admin bilan bog'lanish ─────────────────────────────────────────

// Murojaat kutilayotgan foydalanuvchilar (in-memory)
const pendingSupport = new Map<number, 'general' | 'data_deletion'>();

// Ro'yxatdan o'tgan foydalanuvchilar uchun doimiy pastki tugma
const MUROJAAT_BTN = '✍️ Murojaat';
const mainKeyboard = Markup.keyboard([[MUROJAAT_BTN]]).resize();

async function askMurojaat(ctx: Context) {
  const from = ctx.from;
  if (!from) return;
  pendingSupport.set(from.id, 'general');
  await ctx.replyWithMarkdown(
    `✍️ *Murojaatingizni yozing.*\n\n` +
    `Savolingiz, taklifingiz yoki ma'lumotlaringizni o'chirish so'rovini shu yerga yozib yuboring — admin ko'rib chiqadi.\n\n` +
    `Bekor qilish: /help`,
  );
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
  const id = Number((ctx.match as RegExpMatchArray)[1]);
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

// ─── Matnli xabarlar (murojaat yoki noma'lum buyruq) ────────────────────────────

bot.on('message', async (ctx: Context) => {
  const from = ctx.from;
  const text = (ctx.message as any)?.text as string | undefined;

  // Pastki "Murojaat" tugmasi bosilganda
  if (from && text === MUROJAAT_BTN) {
    await askMurojaat(ctx);
    return;
  }

  if (from && text && pendingSupport.has(from.id)) {
    pendingSupport.delete(from.id);
    const fromName = `${from.first_name || 'Foydalanuvchi'}${from.username ? ' (@' + from.username + ')' : ''}`;
    try {
      const requestId = await createSupportRequest(String(from.id), fromName, text, 'general');
      const adminCount = await forwardToAdmins(requestId, fromName, String(from.id), text);
      if (adminCount > 0) {
        await ctx.reply('✅ Murojaatingiz adminga yuborildi. Tez orada javob beriladi.');
      } else {
        await ctx.reply('✅ Murojaatingiz qabul qilindi.');
      }
    } catch (e: any) {
      console.error('Murojaat saqlashda xato:', e.message);
      await ctx.reply("Xatolik yuz berdi. Iltimos keyinroq qayta urinib ko'ring.");
    }
    return;
  }

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

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
