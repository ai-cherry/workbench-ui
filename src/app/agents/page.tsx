'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getBackendUrl, backendJson } from '@/lib/backend';
import { readSSE } from '@/lib/sse';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Activity, Play, StopCircle, Server, Shield, Terminal } from 'lucide-react';

type AgentType = 'orchestrator' | 'developer' | 'infrastructure' | 'monitor' | 'team';

export default function AgentsDashboard() {
  const backend = getBackendUrl();
  const [token, setToken] = useState<string>('');
  const [username, setUsername] = useState('ceo');
  const [password, setPassword] = useState('payready2025');
  const [agent, setAgent] = useState<AgentType>('orchestrator');
  const [prompt, setPrompt] = useState('Summarize system health and next steps.');
  const [streaming, setStreaming] = useState(false);
  const [log, setLog] = useState<Array<{ type: string; text: string }>>([]);
  const [health, setHealth] = useState<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isAuthed = !!token;

  const appendLog = useCallback((type: string, text: string) => {
    setLog((prev) => [...prev, { type, text }]);
  }, []);

  const login = useCallback(async () => {
    try {
      const res = await fetch(`${backend}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Login failed: ${res.status} ${t}`);
      }
      const data = await res.json();
      setToken(data.access_token);
      toast.success('Authenticated');
    } catch (e: any) {
      toast.error(e.message || 'Login failed');
    }
  }, [backend, username, password]);

  const logout = () => {
    setToken('');
    setLog([]);
  };

  const runAgent = useCallback(async () => {
    if (!isAuthed) return toast.error('Login first');
    if (streaming) return;
    setStreaming(true);
    setLog([]);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`${backend}/agent/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agent,
          stream: true,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => '');
        throw new Error(`Execute failed: ${res.status} ${t}`);
      }
      for await (const msg of readSSE(res.body)) {
        if (msg.event === 'thinking' && msg.data) {
          appendLog('thinking', msg.data);
        } else if (msg.event === 'tool_start' && msg.data) {
          appendLog('tool', `START ${msg.data}`);
        } else if (msg.event === 'tool_end' && msg.data) {
          appendLog('tool', `END ${msg.data}`);
        } else if (msg.data) {
          // tokens or final content
          try {
            const parsed = JSON.parse(msg.data);
            if (parsed.token) appendLog('token', parsed.token);
            if (parsed.content) appendLog('final', parsed.content);
          } catch {
            appendLog('data', msg.data);
          }
        }
      }
    } catch (e: any) {
      appendLog('error', e.message || String(e));
      toast.error('Agent run failed');
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [appendLog, backend, token, prompt, agent, isAuthed, streaming]);

  const stopRun = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const fetchHealth = useCallback(async () => {
    try {
      const data = await backendJson('/health');
      setHealth(data);
    } catch (e: any) {
      setHealth({ error: e.message });
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const services = useMemo(() => Object.entries(health?.services || {}), [health]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Agents Dashboard</h1>
          <Badge className="bg-blue-600">Backend: {backend}</Badge>
        </div>

        <Tabs defaultValue="control">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="control">Control</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="log">Trace</TabsTrigger>
          </TabsList>

          <TabsContent value="control" className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Auth */}
            <Card className="bg-gray-800/60 border-gray-700">
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>Login to backend controller</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">Username</label>
                  <input className="w-full mt-1 rounded bg-gray-900 border border-gray-700 p-2" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-400">Password</label>
                  <input type="password" className="w-full mt-1 rounded bg-gray-900 border border-gray-700 p-2" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  {!isAuthed ? (
                    <Button onClick={login} className="bg-green-600 hover:bg-green-700">
                      <Shield className="w-4 h-4 mr-2" />Login
                    </Button>
                  ) : (
                    <Button onClick={logout} variant="destructive" className="bg-red-600 hover:bg-red-700">
                      <StopCircle className="w-4 h-4 mr-2" />Logout
                    </Button>
                  )}
                </div>
                {isAuthed && <p className="text-xs text-green-400">Authenticated</p>}
              </CardContent>
            </Card>

            {/* Runner */}
            <Card className="bg-gray-800/60 border-gray-700 md:col-span-2">
              <CardHeader>
                <CardTitle>Run Agent</CardTitle>
                <CardDescription>Execute real agent with streaming output</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-gray-400">Agent</label>
                    <select
                      className="w-full mt-1 rounded bg-gray-900 border border-gray-700 p-2"
                      value={agent}
                      onChange={(e) => setAgent(e.target.value as AgentType)}
                    >
                      <option value="orchestrator">Orchestrator</option>
                      <option value="developer">Developer</option>
                      <option value="infrastructure">Infrastructure</option>
                      <option value="monitor">Monitor</option>
                      <option value="team">Team</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-gray-400">Prompt</label>
                    <input
                      className="w-full mt-1 rounded bg-gray-900 border border-gray-700 p-2"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Enter your instruction"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={runAgent} disabled={!isAuthed || streaming} className="bg-blue-600 hover:bg-blue-700">
                    <Play className="w-4 h-4 mr-2" />Run
                  </Button>
                  <Button onClick={stopRun} disabled={!streaming} className="bg-gray-600 hover:bg-gray-700">
                    <StopCircle className="w-4 h-4 mr-2" />Stop
                  </Button>
                </div>
                <div className="h-64 overflow-auto rounded border border-gray-700 bg-black/40 p-3 font-mono text-sm">
                  {log.length === 0 ? (
                    <p className="text-gray-500">No output yet. Run an agent to stream output.</p>
                  ) : (
                    log.map((l, i) => (
                      <div key={i} className={cn('whitespace-pre-wrap', l.type === 'error' && 'text-red-400', l.type === 'tool' && 'text-purple-300', l.type === 'thinking' && 'text-yellow-300')}>
                        {l.type === 'token' ? <span>{l.text}</span> : <span>[{l.type.toUpperCase()}] {l.text}</span>}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="mt-4">
            <Card className="bg-gray-800/60 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Backend Health</CardTitle>
                    <CardDescription>FastAPI + MCP server statuses from backend</CardDescription>
                  </div>
                  <Button onClick={fetchHealth} className="bg-gray-700 hover:bg-gray-600">
                    <Activity className="w-4 h-4 mr-2" />Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {health?.error && <p className="text-red-400">{health.error}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map(([id, s]: any) => (
                    <div key={id} className="p-4 rounded bg-gray-900/60 border border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium capitalize">{id}</p>
                          <p className="text-xs text-gray-400">{s.name || 'Service'}</p>
                        </div>
                      </div>
                      <Badge className={cn('capitalize',
                        String(s.status).includes('online') || String(s.status).includes('healthy') ? 'bg-green-600' : 'bg-red-600'
                      )}>{s.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="log" className="mt-4">
            <Card className="bg-gray-800/60 border-gray-700">
              <CardHeader>
                <CardTitle>Trace Log</CardTitle>
                <CardDescription>Full stream history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 overflow-auto rounded border border-gray-700 bg-black/40 p-3 font-mono text-sm">
                  {log.length === 0 ? (
                    <p className="text-gray-500">No logs yet.</p>
                  ) : (
                    log.map((l, i) => (
                      <div key={i} className={cn('whitespace-pre-wrap', l.type === 'error' && 'text-red-400', l.type === 'tool' && 'text-purple-300', l.type === 'thinking' && 'text-yellow-300')}>
                        [{new Date().toLocaleTimeString()}] {l.type.toUpperCase()} - {l.text}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

