// Instagram OAuth'ni ochish: kompyuterda popup, telefonda to'liq redirect.

export type IgConnectResult =
  | { status: 'redirecting' }              // mobil: sahifa Instagram'ga o'tyapti
  | { status: 'connected'; username?: string }
  | { status: 'error'; error: string }
  | { status: 'cancelled' };               // foydalanuvchi popupni yopdi

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 768;
  return uaMobile || (coarse && narrow);
}

async function fetchOAuthUrl(): Promise<string> {
  const res = await fetch('/api/instagram/oauth-url');
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as any));
    throw new Error(data.message || data.error || 'OAuth URL olishda xato');
  }
  const { url } = await res.json();
  if (!url) throw new Error('OAuth URL bo\'sh');
  return url;
}

export async function connectInstagram(): Promise<IgConnectResult> {
  const url = await fetchOAuthUrl();

  // Mobil: butun sahifani yo'naltiramiz (popup mobil brauzerlarда ishonchsiz)
  if (isMobileDevice()) {
    window.location.href = url;
    return { status: 'redirecting' };
  }

  // Desktop: markazlashtirilgan popup
  const w = 600;
  const h = 750;
  const dualLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualTop = window.screenTop ?? window.screenY ?? 0;
  const vw = window.innerWidth || document.documentElement.clientWidth || screen.width;
  const vh = window.innerHeight || document.documentElement.clientHeight || screen.height;
  const left = dualLeft + Math.max(0, (vw - w) / 2);
  const top = dualTop + Math.max(0, (vh - h) / 2);

  const popup = window.open(
    url,
    'ig_oauth',
    `scrollbars=yes,resizable=yes,width=${w},height=${h},top=${top},left=${left}`,
  );

  // Popup bloklangan bo'lsa — redirect'ga qaytamiz
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    window.location.href = url;
    return { status: 'redirecting' };
  }

  return new Promise<IgConnectResult>((resolve) => {
    let settled = false;

    const finish = (result: IgConnectResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearInterval(timer);
      try { popup.close(); } catch { /* ignore */ }
      resolve(result);
    };

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data;
      if (!d || d.source !== 'ig-oauth') return;
      if (d.connected === '1') {
        finish({ status: 'connected', username: d.username ? decodeURIComponent(d.username) : undefined });
      } else {
        finish({ status: 'error', error: decodeURIComponent(d.error || 'unknown') });
      }
    };

    window.addEventListener('message', onMessage);

    // Foydalanuvchi popupni qo'lda yopsa — bekor qilingan deb hisoblaymiz
    const timer = setInterval(() => {
      if (popup.closed) finish({ status: 'cancelled' });
    }, 500);
  });
}
