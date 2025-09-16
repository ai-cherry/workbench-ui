import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import yaml from 'js-yaml';

import { getPolicyConfigPath, savePolicyConfig } from '@/lib/server/config';

export async function GET() {
  try {
    const p = getPolicyConfigPath();
    if (!fs.existsSync(p)) return NextResponse.json({ policy: {} });
    const doc = (yaml.load(fs.readFileSync(p, 'utf8')) as any) || {};
    return NextResponse.json({ policy: doc });
  } catch (error) {
    return NextResponse.json({ policy: {}, error: (error as Error).message }, { status: 500 });
  }
}

function hasAdminAuthorization(req: NextRequest) {
  const admin = process.env.ADMIN_WRITE_TOKEN;
  if (!admin) return false;
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${admin}`;
}

async function handleWrite(
  req: NextRequest,
  options: { requireAdmin: boolean }
) {
  try {
    const adminAuthorized = hasAdminAuthorization(req);
    if (options.requireAdmin) {
      if (!adminAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (!adminAuthorized) {
      if (process.env.ALLOW_DEV_WRITES !== 'true') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const payload = await req.json();
    const policy = payload?.policy;
    if (typeof policy !== 'object' || policy === null) {
      return NextResponse.json({ error: 'policy object required' }, { status: 400 });
    }

    savePolicyConfig(policy);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Failed to update policy' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return handleWrite(req, { requireAdmin: true });
}

export async function POST(req: NextRequest) {
  return handleWrite(req, { requireAdmin: false });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
