import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const validUser = process.env.DEMO_USERNAME;
  const validPass = process.env.DEMO_PASSWORD;
  const secret    = process.env.DEMO_AUTH_SECRET;

  if (!validUser || !validPass || !secret) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  if (username === validUser && password === validPass) {
    return NextResponse.json({ token: secret });
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
