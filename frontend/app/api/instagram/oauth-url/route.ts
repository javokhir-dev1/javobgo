import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

export async function GET() {
  try {
    const store = await cookies();
    const token = store.get('tg_access_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const res = await fetch(`${BACKEND}/api/instagram/oauth/url`, {
      headers: { Cookie: `tg_access_token=${token}` },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'backend_unreachable' }, { status: 502 });
  }
}
