import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { agentId, message } = body || {};
    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }
    // Minimal local echo to avoid 404 and unblock UI in local deployments.
    // If you want real model calls, wire to your backend here or call a provider SDK.
    const reply = `Echo from ${agentId || 'local'}: ${String(message).slice(0, 500)}`;
    return NextResponse.json({ ok: true, reply, agentId: agentId || 'local' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'chat handler error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
