'use server';

import { cookies, headers } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || '';

const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const hits = (rateLimitMap.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) return true;
  hits.push(now);
  rateLimitMap.set(ip, hits);
  return false;
}

export type AuthTokenResult =
  | { ok: true; user: { first_name: string; telegram_id: string; username: string | null } }
  | { ok: false; error: 'invalid_token_format' | 'invalid_or_expired_token' | 'too_many_requests' | 'backend_unreachable' };

export async function verifyAuthTokenAction(token: string): Promise<AuthTokenResult> {
  const headerStore = await headers();
  const ip =
    headerStore.get('x-forwarded-for')?.split(',')[0].trim() ||
    headerStore.get('x-real-ip') ||
    'unknown';

  if (isRateLimited(ip)) {
    return { ok: false, error: 'too_many_requests' };
  }

  if (!token) {
    return { ok: false, error: 'invalid_token_format' };
  }

  console.log('[Action] BACKEND_URL:', BACKEND_URL);
  console.log('[Action] INTERNAL_API_SECRET set:', !!INTERNAL_API_SECRET);
  console.log('[Action] Token yuborilmoqda:', token);

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_API_SECRET,
      },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });
  } catch (err: any) {
    console.error('[Action] Backend bilan ulanib bolmadi:', err.message);
    return { ok: false, error: 'backend_unreachable' };
  }

  console.log('[Action] Backend javobi status:', res.status);

  if (!res.ok) {
    if (res.status === 400) return { ok: false, error: 'invalid_token_format' };
    if (res.status === 401) return { ok: false, error: 'invalid_or_expired_token' };
    if (res.status === 429) return { ok: false, error: 'too_many_requests' };
    return { ok: false, error: 'backend_unreachable' };
  }

  const data = await res.json().catch(() => ({}));
  console.log('[Action] Backend javobi body:', data);

  const setCookieHeader = res.headers.get('set-cookie');
  if (setCookieHeader) {
    const cookieStore = await cookies();
    const parts = setCookieHeader.split(';').map((s) => s.trim());
    const [cookieName, cookieValue] = parts[0].split('=').map((s) => s.trim());
    const maxAgeStr = parts.find((p) => p.toLowerCase().startsWith('max-age='));
    const maxAge = maxAgeStr ? parseInt(maxAgeStr.split('=')[1]) : 7 * 24 * 60 * 60;

    cookieStore.set(cookieName, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });
  }

  return { ok: true, user: data.user };
}
