import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { randomUUID } from 'crypto';
import { Telegraf, Context } from 'telegraf';
import { upsertTelegramUser, isUserRegistered, createOtp, getActiveOtp } from './db';

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

  const registered = await isUserRegistered(String(from.id)).catch(() => false);

  if (registered) {
    await ctx.replyWithMarkdown(
      `Salom, *${from.first_name}*! Kirish kodini olish uchun /login yuboring.`,
    );
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
    const otp = await createOtp(telegramId);
    const loginUrl = `${SITE_URL}/login?otp=${otp}`;

    await ctx.replyWithMarkdown(
      `✅ *Ro'yxatdan o'tdingiz!*\n\n` +
      `Kirish kodingiz:\n\n` +
      `\`${otp}\`\n\n` +
      `Bu kod *1 daqiqa* davomida amal qiladi.\n` +
      `Kodni saytdagi kirish sahifasiga kiriting.`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: '🚀 Saytga kirish', url: loginUrl }]],
        },
      },
    );
  } catch (err: any) {
    console.error('Contact xatosi:', err.message);
    await ctx.reply("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.", {
      reply_markup: { remove_keyboard: true },
    });
  }
});

// ─── /login ───────────────────────────────────────────────────────────────────

bot.command('login', async (ctx: Context) => {
  const from = ctx.from;
  if (!from) return;

  const telegramId = String(from.id);

  try {
    const registered = await isUserRegistered(telegramId);
    if (!registered) {
      await ctx.reply("Siz hali ro'yxatdan o'tmagansiz. /start komandasini yuboring.");
      return;
    }

    const activeOtp = await getActiveOtp(telegramId);
    if (activeOtp) {
      await ctx.replyWithMarkdown(
        `Eski kodingiz hali ham amal qiladi:\n\n\`${activeOtp}\`\n\nYoki 1 daqiqa kuting.`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '🔄 Yangi kod', callback_data: 'renew_otp' },
              { text: '🚀 Saytga kirish', url: `${SITE_URL}/login?otp=${activeOtp}` },
            ]],
          },
        },
      );
      return;
    }

    const otp = await createOtp(telegramId);
    const loginUrl = `${SITE_URL}/login?otp=${otp}`;

    const msg = await ctx.replyWithMarkdown(
      `🔑 *Kirish kodingiz:*\n\n\`${otp}\`\n\nUshbu kod *1 daqiqa* davomida amal qiladi.`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Saytga kirish', url: loginUrl },
          ]],
        },
      },
    );

    // 1 daqiqadan so'ng "Yangi kod" tugmasini ko'rsatish
    const chatId    = msg.chat.id;
    const messageId = msg.message_id;
    setTimeout(async () => {
      try {
        await bot.telegram.editMessageReplyMarkup(chatId, messageId, undefined, {
          inline_keyboard: [[{ text: '🔄 Yangi kod olish', callback_data: 'renew_otp' }]],
        });
      } catch {}
    }, 61_000);

  } catch (err: any) {
    console.error('/login xatosi:', err.message);
    await ctx.reply("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
  }
});

// ─── "Yangi kod" tugmasi ──────────────────────────────────────────────────────

bot.action('renew_otp', async (ctx) => {
  const from = ctx.from;
  if (!from) { await ctx.answerCbQuery(); return; }

  const telegramId = String(from.id);

  try {
    const registered = await isUserRegistered(telegramId);
    if (!registered) {
      await ctx.answerCbQuery("Avval /start yuboring");
      return;
    }

    const otp      = await createOtp(telegramId);
    const loginUrl = `${SITE_URL}/login?otp=${otp}`;

    await ctx.editMessageText(
      `🔑 *Yangi kirish kodingiz:*\n\n\`${otp}\`\n\nUshbu kod *1 daqiqa* davomida amal qiladi.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🚀 Saytga kirish', url: loginUrl }]],
        },
      },
    );
    await ctx.answerCbQuery('Yangi kod tayyor!');

    const chatId    = ctx.callbackQuery.message!.chat.id;
    const messageId = ctx.callbackQuery.message!.message_id;
    setTimeout(async () => {
      try {
        await bot.telegram.editMessageReplyMarkup(chatId, messageId, undefined, {
          inline_keyboard: [[{ text: '🔄 Yangi kod olish', callback_data: 'renew_otp' }]],
        });
      } catch {}
    }, 61_000);

  } catch (err: any) {
    console.error('renew_otp xatosi:', err.message);
    await ctx.answerCbQuery('Xatolik yuz berdi');
  }
});

// ─── /help ────────────────────────────────────────────────────────────────────

bot.command('help', async (ctx: Context) => {
  await ctx.replyWithMarkdown(
    `*Avto Komment Bot — yordam*\n\n` +
    `🔹 /start — Ro'yxatdan o'tish yoki xush kelibsiz xabari\n` +
    `🔹 /login — Saytga kirish uchun kod olish\n` +
    `🔹 /help  — Ushbu yordam xabari`,
  );
});

// ─── Noma'lum xabarlar ────────────────────────────────────────────────────────

bot.on('message', async (ctx: Context) => {
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
