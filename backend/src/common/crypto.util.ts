import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { ValueTransformer } from 'typeorm';

/**
 * Maxfiy maydonlarni (Instagram access_token, app_secret) bazada
 * AES-256-GCM bilan shifrlab saqlash uchun yordamchi.
 *
 * Format: v1:<ivBase64>:<tagBase64>:<cipherBase64>
 *
 * Kalit `TOKEN_ENCRYPTION_KEY` env'dan olinadi (istalgan uzunlikdagi parol —
 * SHA-256 orqali 32 baytga keltiriladi). Kalit berilmasa, shifrlash o'chiriladi
 * va qiymatlar o'zgarishsiz saqlanadi (dev muhiti uchun).
 */

const ALGO = 'aes-256-gcm';
const PREFIX = 'v1:';

function getKey(): Buffer | null {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) return null;
  return createHash('sha256').update(secret, 'utf8').digest(); // 32 bayt
}

export function encrypt(plain: string): string {
  const key = getKey();
  if (!key) return plain; // kalit yo'q — shifrlashsiz
  const iv = randomBytes(12); // GCM uchun 96-bit IV
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + iv.toString('base64') + ':' + tag.toString('base64') + ':' + enc.toString('base64');
}

export function decrypt(value: string): string {
  // Shifrlangan format bo'lmasa (eski plaintext yozuvlar) — o'zgarishsiz qaytariladi
  if (!value || !value.startsWith(PREFIX)) return value;
  const key = getKey();
  if (!key) return value;

  try {
    const [, ivB64, tagB64, dataB64] = value.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    // Ochib bo'lmasa — xom qiymatni qaytaramiz (ma'lumot yo'qolmasligi uchun)
    return value;
  }
}

/**
 * TypeORM ustun transformeri — save/update paytida shifrlaydi,
 * find paytida ochadi. null/undefined qiymatlarni tegmasdan o'tkazadi.
 */
export const EncryptedTransformer: ValueTransformer = {
  to(value: string | null): string | null {
    if (value === null || value === undefined) return value ?? null;
    return encrypt(value);
  },
  from(value: string | null): string | null {
    if (value === null || value === undefined) return value ?? null;
    return decrypt(value);
  },
};
