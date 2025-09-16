'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Activity, GitBranch, Server, Terminal, CheckCircle, XCircle, AlertCircle, MessageSquare, Bot, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function HomePage() {
  const [mcpStatus, setMcpStatus] = useState<Record<string, boolean>>({});
  const [githubConnected, setGithubConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  // Chat state (SSE)
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  useEffect(() => {
    checkSystemStatus();
    // Load agents list
    fetch('/api/agents').then(r => r.json()).then((data) => {
      if (Array.isArray(data?.agents)) {
        setAgents(data.agents.map((a: any) => ({ id: a.id || a.name, name: a.name || a.id })));
        if (data.agents.length > 0) setSelectedAgent(data.agents[0].name || data.agents[0].id);
      }
    }).catch(() => {});
  }, []);

  const checkSystemStatus = async () => {
    setLoading(true);
    try {
      // Check MCP health
      const mcpResponse = await fetch('/api/mcp/health');
      const mcpData = await mcpResponse.json();
      
      if (mcpData.servers) {
        const statusMap: Record<string, boolean> = {};
        Object.entries(mcpData.servers).forEach(([key, value]: [string, any]) => {
          // Treat healthy boolean or ok/healthy/online statuses as connected
          const healthy = value?.healthy === true || ['ok', 'healthy', 'online', 'connected'].includes(String(value?.status || '').toLowerCase());
          statusMap[key] = healthy;
        });
        setMcpStatus(statusMap);
      }

      // Check GitHub connection
      setGithubConnected(Boolean(process.env.NEXT_PUBLIC_GITHUB_PAT));
      
      toast.success('System status updated');
    } catch (error) {
      console.error('Error checking system status:', error);
      toast.error('Failed to check system status');
    } finally {
      setLoading(false);
    }
  };

  const testMCPConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mcp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server: 'github' })
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('MCP connection test successful!');
      } else {
        toast.error(`MCP test failed: ${data.error}`);
      }
    } catch (error) {
      toast.error('Failed to test MCP connection');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent) return toast.error('Please select an agent and enter a message');
    const userMessage = inputMessage.trim();
    setInputMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);
    try {
      const response = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: selectedAgent, messages: [...chatMessages, { role: 'user', content: userMessage }] })
      });
      if (!response.ok || !response.body) throw new Error('Chat request failed');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistant = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const lines = chunk.split('\n').map((l) => l.trim());
          let data: string | undefined;
          for (const line of lines) {
            if (line.startsWith('data:')) data = (data ? data + '\n' : '') + line.slice(5).trim();
          }
          if (data) {
            try {
              const payload = JSON.parse(data);
              if (payload.token) {
                assistant += payload.token;
                setChatMessages(prev => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === 'assistant') copy[copy.length - 1] = { role: 'assistant', content: assistant };
                  else copy.push({ role: 'assistant', content: assistant });
                  return copy;
                });
              } else if (payload.content) {
                assistant = payload.content;
                setChatMessages(prev => [...prev, { role: 'assistant', content: assistant }]);
              } else if (payload.error) {
                toast.error(String(payload.error));
              }
            } catch {/* ignore */}
          }
          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch (e) {
      toast.error('Failed to send message');
    } finally {
      setIsStreaming(false);
    }
  };

  const servers = [
    { name: 'GitHub', id: 'github', icon: GitBranch },
    { name: 'Memory', id: 'memory', icon: Server },
    { name: 'Sequential Thinking', id: 'sequential-thinking', icon: Terminal },
    { name: 'Apify', id: 'apify', icon: Activity },
    { name: 'Brave Search', id: 'brave-search', icon: Activity },
    { name: 'Exa', id: 'exa', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Sophia Intel AI Workbench
          </h1>
          <p className="text-gray-400">AI-powered development workspace with MCP integration</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">GitHub Integration</CardTitle>
              <GitBranch className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">ai-cherry</span>
                {githubConnected ? (
                  <Badge className="bg-green-500">Connected</Badge>
                ) : (
                  <Badge className="bg-red-500">Disconnected</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">Organization: ai-cherry</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">MCP Servers</CardTitle>
              <Server className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {Object.values(mcpStatus).filter(Boolean).length}/{servers.length}
                </span>
                <Badge className="bg-blue-500">Active</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-2">Connected servers</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">System Status</CardTitle>
              <Activity className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">Operational</span>
                <Badge className="bg-green-500">Online</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-2">All systems running</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-gray-800">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="servers">MCP Servers</TabsTrigger>
            <TabsTrigger value="repositories">Repositories</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle>AI Agent Chat</CardTitle>
                <CardDescription>Interactive chat with streaming responses</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Agent Select */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <label className="text-sm text-gray-400 mb-1 block">Agent</label>
                    <select
                      className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                    >
                      <option value="">Select Agent</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="h-96 bg-gray-900/50 rounded border border-gray-700 p-4 mb-4 overflow-y-auto">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-32">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start a conversation with an agent.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                            msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'
                          }`}>
                            <div className="text-xs opacity-75 mb-1">
                              {msg.role === 'user' ? 'You' : selectedAgent || 'Assistant'}
                            </div>
                            <div>{msg.content}</div>
                          </div>
                        </div>
                      ))}
                      {isStreaming && (
                        <div className="flex justify-start">
                          <div className="bg-gray-700 text-gray-100 px-3 py-2 rounded-lg">
                            <div className="text-xs opacity-75 mb-1">{selectedAgent || 'Assistant'}</div>
                            <div className="flex items-center gap-1">
                              <div className="animate-bounce">●</div>
                              <div className="animate-bounce" style={{animationDelay: '0.1s'}}>●</div>
                              <div className="animate-bounce" style={{animationDelay: '0.2s'}}>●</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={selectedAgent ? `Message ${selectedAgent}...` : 'Select an agent first'}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-white placeholder-gray-500"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={!selectedAgent || isStreaming}
                  />
                  <Button onClick={handleSendMessage} disabled={!selectedAgent || !inputMessage.trim() || isStreaming} className="bg-blue-600 hover:bg-blue-700">
                    {isStreaming ? <Activity className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models" className="mt-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle>Models & Routing (Portkey)</CardTitle>
                <CardDescription>Gateway toggle and routing smoke test</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400 mb-3">This UI provides a simple smoke test for the backend Portkey router endpoint. Configure backend env <code>ENABLE_PORTKEY=true</code>. In testing mode (<code>TESTING=true</code>) it returns a stub.</p>
                <div className="flex gap-2 mb-3">
                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/agent-router-test', { method: 'POST' });
                        const data = await res.json();
                        toast.success(`Model: ${data.model}`);
                      } catch {
                        toast.error('Router test failed');
                      }
                    }}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" /> Run Routing Test
                  </Button>
                </div>
                <PolicyEditor />
                <p className="text-xs text-gray-500 mt-2">For full policy editing, this simple editor persists a YAML policy to <code>agno/routing.yaml</code>. Backend router reads it when Portkey is enabled.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="mt-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle>Agents</CardTitle>
                <CardDescription>Edit basic agent settings (server persists to agno/config.yaml)</CardDescription>
              </CardHeader>
              <CardContent>
                <AgentEditor agents={agents} onSaved={() => toast.success('Agent saved')} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="servers" className="mt-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle>MCP Server Status</CardTitle>
                <CardDescription>Monitor and manage your MCP server connections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {servers.map((server) => {
                    const Icon = server.icon;
                    const isConnected = mcpStatus[server.id];
                    
                    return (
                      <div
                        key={server.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-gray-900/50 border border-gray-700"
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">{server.name}</p>
                            <p className="text-xs text-gray-500">{server.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isConnected === undefined ? (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          ) : isConnected ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <Badge variant={isConnected ? "success" : "destructive"}>
                            {isConnected === undefined ? 'Unknown' : isConnected ? 'Connected' : 'Disconnected'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="repositories" className="mt-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle>GitHub Repositories</CardTitle>
                <CardDescription>Manage repositories in the ai-cherry organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">workbench-ui</h3>
                        <p className="text-sm text-gray-500">Main UI repository for Sophia Intel AI</p>
                      </div>
                      <Badge className="bg-green-500">Active</Badge>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">sophia-intel-ai</h3>
                        <p className="text-sm text-gray-500">Core AI intelligence system</p>
                      </div>
                      <Badge className="bg-green-500">Active</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="mt-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={checkSystemStatus}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Refresh System Status
                  </Button>
                  <Button 
                    onClick={testMCPConnection}
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Server className="mr-2 h-4 w-4" />
                    Test MCP Connection
                  </Button>
                  <Button 
                    onClick={() => toast.success('GitHub sync initiated')}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <GitBranch className="mr-2 h-4 w-4" />
                    Sync GitHub Repos
                  </Button>
                  <Button 
                    onClick={() => toast('Opening terminal...', { icon: <Terminal className="h-4 w-4" /> })}
                    className="w-full bg-gray-600 hover:bg-gray-700"
                  >
                    <Terminal className="mr-2 h-4 w-4" />
                    Open Terminal
                  </Button>
                  <Link href="/agents" className="w-full">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                      <Server className="mr-2 h-4 w-4" />
                      Open Agents Dashboard
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>© 2024 AI Cherry • Sophia Intel AI Workbench v0.1.0</p>
          <p className="mt-2">Powered by Agno Framework & MCP</p>
        </div>
      </div>
    </div>
  );
}

function PolicyEditor() {
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState<any>({ plan: { primary: '@openai/gpt-4o-mini' }, code: { primary: '@deepseek/deepseek-coder' }, search: { primary: '@openai/gpt-4o-mini' } });
  const [msg, setMsg] = useState<string>('');
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/models/policy');
        const data = await res.json();
        if (data?.policy) setPolicy(data.policy);
      } catch {}
    })();
  }, []);
  const save = async () => {
    try {
      setLoading(true);
      const secureWrites = process.env.NEXT_PUBLIC_ENABLE_SECURE_WRITES === 'true';
      const res = await fetch('/api/models/policy', { method: secureWrites ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ policy }) });
      if (!res.ok) throw new Error('Failed');
      setMsg('Saved'); setTimeout(() => setMsg(''), 1500);
    } catch { setMsg('Failed'); } finally { setLoading(false); }
  };
  const renderTask = (task: string) => (
    <div key={task} className="p-3 rounded border border-gray-700 bg-gray-900/50">
      <div className="font-medium mb-2">{task}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input className="bg-gray-900 border border-gray-700 rounded p-2 text-white" placeholder="primary model id" value={policy?.[task]?.primary || ''} onChange={(e) => setPolicy({ ...policy, [task]: { ...(policy?.[task] || {}), primary: e.target.value } })} />
        <input className="bg-gray-900 border border-gray-700 rounded p-2 text-white" placeholder="fallbacks (comma-separated)" value={(policy?.[task]?.fallbacks || []).join(',')} onChange={(e) => setPolicy({ ...policy, [task]: { ...(policy?.[task] || {}), fallbacks: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })} />
        <input className="bg-gray-900 border border-gray-700 rounded p-2 text-white" placeholder="maxLatencyMs" value={policy?.[task]?.maxLatencyMs || ''} onChange={(e) => setPolicy({ ...policy, [task]: { ...(policy?.[task] || {}), maxLatencyMs: Number(e.target.value || 0) } })} />
      </div>
    </div>
  );
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-3 mb-3">
        {['plan', 'code', 'search'].map(renderTask)}
      </div>
      <Button onClick={save} disabled={loading} className="bg-purple-600 hover:bg-purple-700">Save Policy</Button>
      {msg && <span className="ml-2 text-xs text-gray-400">{msg}</span>}
    </div>
  );
}

function AgentEditor({ agents, onSaved }: { agents: Array<{ id: string; name: string }>; onSaved: () => void }) {
  const [selected, setSelected] = useState<string>('');
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState<string>('');
  const [maxTokens, setMaxTokens] = useState<string>('');
  useEffect(() => { if (agents.length && !selected) setSelected(agents[0].id); }, [agents]);
  const save = async () => {
    try {
      const body: any = { id: selected };
      if (model) body.model = model;
      if (temperature) body.temperature = Number(temperature);
      if (maxTokens) body.max_tokens = Number(maxTokens);
      const secureWrites = process.env.NEXT_PUBLIC_ENABLE_SECURE_WRITES === 'true';
      const res = await fetch('/api/agents', { method: secureWrites ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed');
      onSaved();
      setModel(''); setTemperature(''); setMaxTokens('');
    } catch { toast.error('Save failed'); }
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <select className="bg-gray-900 border border-gray-700 rounded p-2 text-white" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input className="bg-gray-900 border border-gray-700 rounded p-2 text-white" placeholder="model" value={model} onChange={(e) => setModel(e.target.value)} />
        <input className="bg-gray-900 border border-gray-700 rounded p-2 text-white" placeholder="temperature" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
        <input className="bg-gray-900 border border-gray-700 rounded p-2 text-white" placeholder="max tokens" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} />
      </div>
      <Button onClick={save} className="bg-indigo-600 hover:bg-indigo-700">Save Agent</Button>
    </div>
  );
}
