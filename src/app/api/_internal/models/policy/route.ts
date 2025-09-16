import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

function deny(msg: string, code = 403) {
  return NextResponse.json({ error: msg }, { status: code });
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.INTERNAL_WRITE_ENABLED !== 'true') return deny('Internal writes disabled');
    const host = req.headers.get('host') || '';
    if (!host.includes('localhost')) return deny('Localhost only');

    const payload = await req.json();
    const policy = payload?.policy;
    if (typeof policy !== 'object' || policy === null) {
      return NextResponse.json({ error: 'policy object required' }, { status: 400 });
    }
    const p = path.join(process.cwd(), 'agno/routing.yaml');
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, yaml.dump(policy, { noRefs: true }), 'utf8');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

