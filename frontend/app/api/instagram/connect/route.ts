import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

export async function POST(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get('tg_access_token')?.value;
    const body = await req.json();

    const res = await fetch(`${BACKEND}/api/instagram/account/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Cookie: `tg_access_token=${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'backend_unreachable' }, { status: 502 });
  }
}
