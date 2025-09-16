import { NextResponse } from 'next/server';

export async function POST() {
  const origin = process.env.NEXT_PUBLIC_API_ORIGIN || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const res = await fetch(`${origin}/agent/router`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'plan', prompt: 'Say hello' })
  });
  const data = await res.json().catch(() => ({ error: 'invalid response' }));
  return NextResponse.json(data, { status: res.status });
}

