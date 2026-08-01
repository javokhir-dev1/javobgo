import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// scrypt parametrlari. N ni oshirsangiz hash sekinlashadi (xavfsizroq).
// Saqlangan hash ichida ham yozilgani uchun eski parollar buzilmaydi.
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;

/**
 * Parolni hashlaydi. Natija: scrypt$N$r$p$<salt-base64>$<hash-base64>
 *
 * bcrypt o'rniga Node'ning o'z scrypt'i ishlatilgan — tashqi paket kerak emas,
 * VPS da native modul kompilyatsiyasi bilan bog'liq muammo chiqmaydi.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = (await scryptAsync(plain.normalize('NFKC'), salt, KEYLEN, {
    N, r: R, p: P,
  })) as Buffer;
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

/** Parolni saqlangan hash bilan solishtiradi (timing-safe). */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, saltB64, keyB64] = (stored || '').split('$');
    if (scheme !== 'scrypt') return false;

    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(keyB64, 'base64');
    if (!salt.length || !expected.length) return false;

    const key = (await scryptAsync(plain.normalize('NFKC'), salt, expected.length, {
      N: Number(n), r: Number(r), p: Number(p),
    })) as Buffer;

    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

/** Emailni bir xil ko'rinishga keltiradi — katta-kichik harf farqi bilan dublikat bo'lmasligi uchun */
export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}
