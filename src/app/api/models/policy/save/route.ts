import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export async function POST(req: NextRequest) {
  try {
    if (process.env.ALLOW_DEV_WRITES !== 'true') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
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

