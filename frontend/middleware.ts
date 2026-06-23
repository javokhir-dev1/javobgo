import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/auth/callback', '/api/'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public yo'llarni o'tkazib yubor
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get('tg_access_token')?.value;

  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
};
