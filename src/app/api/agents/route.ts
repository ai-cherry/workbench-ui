import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import yaml from 'js-yaml';

import { getAgentConfigPath, updateAgentConfig } from '@/lib/server/config';

interface AgentEntry {
  name?: string;
  model?: string;
  description?: string;
  capabilities?: string[];
  mcp_access?: string[];
  max_tokens?: number;
  temperature?: number;
}

export async function GET() {
  try {
    const configPath = getAgentConfigPath();
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ agents: [], error: 'Agno config.yaml not found' });
    }
    const doc = (yaml.load(fs.readFileSync(configPath, 'utf8')) as any) || {};
    const agents: any[] = [];
    if (doc.agents && typeof doc.agents === 'object') {
      for (const [id, val] of Object.entries(doc.agents as Record<string, AgentEntry>)) {
        const v = val as AgentEntry;
        agents.push({
          id,
          name: v.name || id,
          model: v.model || 'unknown',
          description: v.description || `${id} agent`,
          capabilities: v.capabilities || [],
          mcp_access: v.mcp_access || [],
          max_tokens: v.max_tokens,
          temperature: v.temperature,
          status: 'ready'
        });
      }
    }
    return NextResponse.json({ agents, total: agents.length, timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ agents: [], error: (error as Error).message }, { status: 500 });
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
    const { id, model, temperature, max_tokens, description } = payload || {};
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    updateAgentConfig({ id, model, temperature, max_tokens, description });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Failed to update agent' }, { status: 500 });
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
