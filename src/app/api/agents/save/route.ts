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
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

