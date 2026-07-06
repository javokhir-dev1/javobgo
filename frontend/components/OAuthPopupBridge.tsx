'use client';

import { useEffect } from 'react';

/**
 * OAuth popup ichida yuklanadigan "ko'prik".
 * Instagram'dan qaytгач backend bizni `/?ig_connected=1` (yoki `?ig_error=...`) ga
 * yo'naltiradi. Agar bu sahifa popup ichida ochilgan bo'lsa (window.opener mavjud),
 * natijani ochган oynaga postMessage qilib, popupni yopamiz.
 *
 * Mobil (to'liq redirect) oqimida window.opener bo'lmaydi, shuning uchun bu komponent
 * hech narsa qilmaydi va odatdagidek query-param orqali ishlanadi.
 */
export default function OAuthPopupBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const opener = window.opener;
    if (!opener || opener === window) return;

    const params = new URLSearchParams(window.location.search);
    const connected = params.get('ig_connected');
    const error = params.get('ig_error');
    if (!connected && !error) return;

    try {
      opener.postMessage(
        {
          source: 'ig-oauth',
          connected,
          error,
          username: params.get('username'),
        },
        window.location.origin,
      );
    } catch {
      /* ignore */
    }
    // Ochган oyna xabarni oldi — popupni yopamiz
    window.close();
  }, []);

  return null;
}
