import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export async function GET() {
  try {
    const p = path.join(process.cwd(), 'agno/routing.yaml');
    if (!fs.existsSync(p)) return NextResponse.json({ policy: {} });
    const doc = (yaml.load(fs.readFileSync(p, 'utf8')) as any) || {};
    return NextResponse.json({ policy: doc });
  } catch (error) {
    return NextResponse.json({ policy: {}, error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = process.env.ADMIN_WRITE_TOKEN;
    const auth = req.headers.get('authorization') || '';
    if (!admin || auth !== `Bearer ${admin}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json({ error: (error as Error).message || 'Failed to update policy' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
