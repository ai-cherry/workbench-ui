import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

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
    const configPath = path.join(process.cwd(), 'agno/config.yaml');
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

export async function PUT(req: NextRequest) {
  try {
    const admin = process.env.ADMIN_WRITE_TOKEN;
    const auth = req.headers.get('authorization') || '';
    if (!admin || auth !== `Bearer ${admin}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await req.json();
    const { id, model, temperature, max_tokens, description } = payload || {};
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const configPath = path.join(process.cwd(), 'agno/config.yaml');
    let doc: any = {};
    if (fs.existsSync(configPath)) doc = yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
    if (!doc.agents) doc.agents = {};
    if (!doc.agents[id]) doc.agents[id] = {};
    if (model !== undefined) doc.agents[id].model = model;
    if (temperature !== undefined) doc.agents[id].temperature = temperature;
    if (max_tokens !== undefined) doc.agents[id].max_tokens = max_tokens;
    if (description !== undefined) doc.agents[id].description = description;
    fs.writeFileSync(configPath, yaml.dump(doc, { noRefs: true }), 'utf8');
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Failed to update agent' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
