import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

async function cookieHeader() {
  const store = await cookies();
  const token = store.get('tg_access_token')?.value;
  return token ? { Cookie: `tg_access_token=${token}` } : {};
}

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/instagram/account`, {
      headers: await cookieHeader(),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'backend_unreachable' }, { status: 502 });
  }
}

export async function DELETE() {
  try {
    const res = await fetch(`${BACKEND}/api/instagram/account/disconnect`, {
      method: 'DELETE',
      headers: await cookieHeader(),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'backend_unreachable' }, { status: 502 });
  }
}
