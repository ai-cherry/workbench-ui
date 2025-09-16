import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

type AgentUpdatePayload = {
  id: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  description?: string;
};

type PolicyPayload = Record<string, unknown>;

const workspaceRoot = process.cwd();
const agentConfigPath = path.join(workspaceRoot, 'agno/config.yaml');
const policyConfigPath = path.join(workspaceRoot, 'agno/routing.yaml');

function readYaml(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return (yaml.load(raw) as any) || {};
}

function writeYaml(filePath: string, data: any) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, yaml.dump(data, { noRefs: true }), 'utf8');
}

export function updateAgentConfig(payload: AgentUpdatePayload) {
  const doc = readYaml(agentConfigPath);
  if (!doc.agents || typeof doc.agents !== 'object') {
    doc.agents = {};
  }
  if (!doc.agents[payload.id]) {
    doc.agents[payload.id] = {};
  }
  if (payload.model !== undefined) {
    doc.agents[payload.id].model = payload.model;
  }
  if (payload.temperature !== undefined) {
    doc.agents[payload.id].temperature = payload.temperature;
  }
  if (payload.max_tokens !== undefined) {
    doc.agents[payload.id].max_tokens = payload.max_tokens;
  }
  if (payload.description !== undefined) {
    doc.agents[payload.id].description = payload.description;
  }

  writeYaml(agentConfigPath, doc);
}

export function savePolicyConfig(policy: PolicyPayload) {
  writeYaml(policyConfigPath, policy);
}

export function getAgentConfigPath() {
  return agentConfigPath;
}

export function getPolicyConfigPath() {
  return policyConfigPath;
}
