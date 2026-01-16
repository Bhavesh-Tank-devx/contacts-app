// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { STRAPI_URL } from '@/lib/strapi.server';

export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json();

    const res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error.message }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}