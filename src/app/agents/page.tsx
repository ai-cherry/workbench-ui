'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getBackendUrl, backendJson, backendJsonAuth } from '@/lib/backend';
import { readSSE } from '@/lib/sse';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Activity, Play, StopCircle, Server, Shield, Terminal, RotateCw } from 'lucide-react';

type AgentType = 'orchestrator' | 'developer' | 'infrastructure' | 'monitor' | 'team';
type RunEntry = {
  id: string;
  type: 'agent' | 'workflow';
  timestamp: number;
  agent?: AgentType;
  prompt?: string;
  workflow?: string;
  final?: string;
};

export default function AgentsDashboard() {
  const backend = getBackendUrl();
  const [token, setToken] = useState<string>('');
  const [username, setUsername] = useState('ceo');
  const [password, setPassword] = useState('payready2025');
  const [agent, setAgent] = useState<AgentType>('orchestrator');
  const [prompt, setPrompt] = useState('Summarize system health and next steps.');
  const [streaming, setStreaming] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFinalRef = useRef<string>('');
  const [log, setLog] = useState<Array<{ type: string; text: string; step?: number }>>([]);
  const logRef = useRef<HTMLDivElement | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [workflows, setWorkflows] = useState<Array<{name:string; description:string; steps:number}>>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [lastRun, setLastRun] = useState<{ type: 'agent' | 'workflow'; workflow?: string } | null>(null);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [runs, setRuns] = useState<RunEntry[]>([]);

  const isAuthed = !!token;

  const appendLog = useCallback((type: string, text: string, step?: number) => {
    setLog((prev) => [...prev, { type, text, step }]);
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

  // Load/save recent runs (local-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('agents_runs');
      if (raw) setRuns(JSON.parse(raw));
    } catch {}
  }, []);

  const saveRun = useCallback((entry: RunEntry) => {
    try {
      const next = [entry, ...runs].slice(0, 20);
      setRuns(next);
      localStorage.setItem('agents_runs', JSON.stringify(next));
    } catch {}
  }, [runs]);

  const runAgent = useCallback(async () => {
    if (!isAuthed) return toast.error('Login first');
    if (streaming) return;
    setStreaming(true);
    setPaused(false);
    setLog([]);
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    setLastRun({ type: 'agent' });

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
        if (paused) continue;
        if (msg.event === 'thinking' && msg.data) {
          appendLog('thinking', msg.data);
        } else if (msg.event === 'tool_start' && msg.data) {
          appendLog('tool', `START ${msg.data}`);
        } else if (msg.event === 'tool_end' && msg.data) {
          appendLog('tool', `END ${msg.data}`);
        } else if (msg.event === 'open') {
          appendLog('data', 'Connection opened');
        } else if (msg.event === 'hb') {
          // optional: render subtle heartbeat
        } else if (msg.event === 'done') {
          appendLog('data', 'Run complete');
          break;
        } else if (msg.data) {
          // tokens or final content
          try {
            const parsed = JSON.parse(msg.data);
            if (parsed.token) appendLog('token', parsed.token);
            if (parsed.content) {
              lastFinalRef.current = parsed.content;
              appendLog('final', parsed.content);
            }
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
      setPaused(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      abortRef.current = null;
      // Save run
      saveRun({ id: `${Date.now()}`, type: 'agent', timestamp: Date.now(), agent, prompt, final: lastFinalRef.current });
    }
  }, [appendLog, backend, token, prompt, agent, isAuthed, streaming, paused, saveRun]);

  const stopRun = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setPaused(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const retryRun = async () => {
    if (streaming || !isAuthed || !lastRun) return;
    if (lastRun.type === 'agent') {
      return runAgent();
    }
    if (lastRun.type === 'workflow') {
      const wf = lastRun.workflow || selectedWorkflow;
      if (!wf) return;
      setStreaming(true); setPaused(false); setLog([]); setElapsed(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setElapsed((e)=>e+1), 1000);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`${backend}/agent/workflow/execute?name=${encodeURIComponent(wf)}` ,{
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: controller.signal
        });
        if (!res.ok || !res.body) throw new Error(`Execute failed: ${res.status}`);
        for await (const msg of readSSE(res.body)) {
          if (paused) continue;
          if (msg.event === 'open') appendLog('data','Connection opened');
          else if (msg.event === 'hb') {/* noop */}
          else if (msg.event === 'step_start' && msg.data) appendLog('tool', `STEP START ${msg.data}`);
          else if (msg.event === 'step_end' && msg.data) appendLog('tool', `STEP END ${msg.data}`);
          else if (msg.event === 'done') { appendLog('data','Workflow complete'); break; }
          else if (msg.event === 'thinking' && msg.data) appendLog('thinking', msg.data);
          else if (msg.data) {
            try { const p = JSON.parse(msg.data); if (p.token) appendLog('token', p.token); if (p.content) { lastFinalRef.current = p.content; appendLog('final', p.content); } }
            catch { appendLog('data', msg.data); }
          }
        }
      } catch (e: any) { appendLog('error', e.message || String(e)); toast.error('Workflow failed'); }
      finally { setStreaming(false); setPaused(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current=null; } abortRef.current=null; }
    }
  };

  // Auto-scroll logs to bottom on new entries
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await backendJson('/health');
      setHealth(data);
    } catch (e: any) {
      setHealth({ error: e.message });
    }
  }, []);

  const fetchWorkflows = useCallback(async () => {
    if (!token) return;
    try {
      const data = await backendJsonAuth<{workflows: any[]}>('/agent/workflow/list', token);
      setWorkflows(data.workflows || []);
      if (data.workflows?.length && !selectedWorkflow) setSelectedWorkflow(data.workflows[0].name);
    } catch (e: any) {
      // ignore
    }
  }, [token, selectedWorkflow]);

  useEffect(() => {
    fetchHealth();
    fetchWorkflows();
  }, [fetchHealth, fetchWorkflows]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const services = useMemo(() => Object.entries(health?.services || {}), [health]);
  const overallHealth = useMemo(() => {
    const list: any[] = services.map(([, s]) => s);
    if (!list.length) return 'unknown';
    const status = (x: any) => String(x?.status || '').toLowerCase();
    const healthy = list.every((s) => /online|healthy/.test(status(s)));
    if (healthy) return 'healthy';
    const any = list.some((s) => /online|healthy|degraded/.test(status(s)));
    return any ? 'degraded' : 'unhealthy';
  }, [services]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-3xl font-bold">Agents Dashboard</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-blue-600">Backend: {backend}</Badge>
            {services.map(([id, s]: any) => {
              const ok = String(s.status || '').toLowerCase();
              const healthy = ok.includes('online') || ok.includes('healthy');
              const label = id === 'filesystem' ? 'fs' : id === 'vector' ? 'vec' : id === 'memory' ? 'mem' : id;
              return (
                <span key={id} className={`text-xs px-2 py-0.5 rounded ${healthy ? 'bg-green-600' : 'bg-red-600'}`}>{label}</span>
              );
            })}
          </div>
        </div>
        {/* Overall MCP health banner */}
        <div className={`w-full rounded p-2 text-sm ${overallHealth==='healthy' ? 'bg-green-900/40 border border-green-700' : overallHealth==='degraded' ? 'bg-yellow-900/40 border border-yellow-700' : 'bg-red-900/40 border border-red-700'}`}>
          MCP status: {overallHealth}
        </div>

        <Tabs defaultValue="control">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="control">Control</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="log">Trace</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
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
                      disabled={streaming}
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
                      disabled={streaming}
                      placeholder="Enter your instruction"
                      />
                    </div>
                  </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <Button onClick={runAgent} disabled={!isAuthed || streaming} className="bg-blue-600 hover:bg-blue-700">
                    <Play className="w-4 h-4 mr-2" />Run
                  </Button>
                  <Button onClick={stopRun} disabled={!streaming} className="bg-gray-600 hover:bg-gray-700">
                    <StopCircle className="w-4 h-4 mr-2" />Stop
                  </Button>
                  <Button onClick={retryRun} disabled={!isAuthed || streaming || !lastRun} className="bg-indigo-600 hover:bg-indigo-700">Retry</Button>
                  <Button onClick={() => setPaused((p) => !p)} disabled={!streaming} className="bg-amber-600 hover:bg-amber-700">
                    {paused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button onClick={retryRun} disabled={!isAuthed || streaming || !lastRun} className="bg-indigo-600 hover:bg-indigo-700">Retry</Button>
                  <Button onClick={() => setLog([])} className="bg-slate-600 hover:bg-slate-700" disabled={streaming}>Clear</Button>
                  <Button onClick={() => { if (lastFinalRef.current) { navigator.clipboard.writeText(lastFinalRef.current); toast.success('Copied'); } }} className="bg-emerald-600 hover:bg-emerald-700" disabled={!lastFinalRef.current}>Copy Final</Button>
                  {streaming && <Badge className="bg-yellow-600">Running… {elapsed}s</Badge>}
                </div>
                <div ref={logRef} className="h-64 overflow-auto rounded border border-gray-700 bg-black/40 p-3 font-mono text-sm">
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
                        [{new Date().toLocaleTimeString()}]{l.step ? ` [Step ${l.step}]` : ''} {l.type.toUpperCase()} - {l.text}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflows" className="mt-4">
            <Card className="bg-gray-800/60 border-gray-700">
              <CardHeader>
                <CardTitle>Run Workflow</CardTitle>
                <CardDescription>Execute config-defined workflows with streamed output</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-sm text-gray-400">Workflow</label>
                    <select
                      className="w-full mt-1 rounded bg-gray-900 border border-gray-700 p-2"
                      value={selectedWorkflow}
                      onChange={(e) => setSelectedWorkflow(e.target.value)}
                      disabled={!isAuthed || streaming}
                    >
                      {workflows.map(w => <option key={w.name} value={w.name}>{w.name} ({w.steps})</option>)}
                    </select>
                    {selectedWorkflow && (
                      <p className="text-xs text-gray-500 mt-1">{workflows.find(w => w.name===selectedWorkflow)?.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <Button
                    onClick={async () => {
                      if (!isAuthed || !selectedWorkflow || streaming) return;
                      setStreaming(true); setPaused(false); setLog([]); setElapsed(0);
                      if (timerRef.current) clearInterval(timerRef.current);
                      timerRef.current = setInterval(() => setElapsed((e)=>e+1), 1000);
                      const controller = new AbortController();
                      abortRef.current = controller;
                      try {
                        const res = await fetch(`${backend}/agent/workflow/execute?name=${encodeURIComponent(selectedWorkflow)}` ,{
                          method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: controller.signal
                        });
                        if (!res.ok || !res.body) throw new Error(`Execute failed: ${res.status}`);
                        for await (const msg of readSSE(res.body)) {
                          if (paused) continue;
                          if (msg.event === 'open') appendLog('data','Connection opened');
                          else if (msg.event === 'hb') {/* noop */}
                          else if (msg.event === 'step_start' && msg.data) {
                            try {
                              const p = JSON.parse(msg.data);
                              const idx = Number(p.index) || null;
                              setCurrentStep(idx);
                              const agentName = p.agent || 'agent';
                              const actionName = p.action || 'action';
                              appendLog('tool', `Start: ${actionName} (${agentName})`, idx || undefined);
                            } catch { appendLog('tool', `Step start ${msg.data}`); }
                          }
                          else if (msg.event === 'step_end' && msg.data) {
                            try {
                              const p = JSON.parse(msg.data);
                              const idx = Number(p.index) || null;
                              appendLog('tool', `End: status=${p.status || 'ok'}`, idx || undefined);
                            } catch { appendLog('tool', `Step end ${msg.data}`); }
                            setCurrentStep(null);
                          }
                          else if (msg.event === 'done') { appendLog('data','Workflow complete'); break; }
                          else if (msg.event === 'thinking' && msg.data) appendLog('thinking', msg.data);
                          else if (msg.data) {
                            try {
                              const p = JSON.parse(msg.data);
                              if (p.token) appendLog('token', p.token, currentStep || undefined);
                              if (p.content) { lastFinalRef.current = p.content; appendLog('final', p.content, currentStep || undefined); }
                            }
                            catch { appendLog('data', msg.data); }
                          }
                        }
                      } catch (e: any) { appendLog('error', e.message || String(e)); toast.error('Workflow failed'); }
                      finally { setStreaming(false); setPaused(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current=null; } abortRef.current=null; }
                    }}
                    disabled={!isAuthed || !selectedWorkflow || streaming}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >Run Workflow</Button>
                  <Button onClick={() => setLog([])} className="bg-slate-600 hover:bg-slate-700" disabled={streaming}>Clear</Button>
                  {streaming && <Badge className="bg-yellow-600">Running… {elapsed}s</Badge>}
                </div>
                <div ref={logRef} className="h-64 overflow-auto rounded border border-gray-700 bg-black/40 p-3 font-mono text-sm">
                  {log.length === 0 ? (
                    <p className="text-gray-500">No output yet. Pick a workflow and run to stream output.</p>
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

          <TabsContent value="runs" className="mt-4">
            <Card className="bg-gray-800/60 border-gray-700">
              <CardHeader>
                <CardTitle>Recent Runs</CardTitle>
                <CardDescription>Replay recent agent or workflow runs</CardDescription>
              </CardHeader>
              <CardContent>
                {runs.length === 0 ? (
                  <p className="text-gray-500">No runs yet.</p>
                ) : (
                  <div className="space-y-2">
                    {runs.map((r) => (
                      <div key={r.id} className="p-3 rounded border border-gray-700 bg-black/30 flex items-center justify-between gap-3">
                        <div className="text-sm">
                          <div className="font-medium">{r.type === 'agent' ? `Agent: ${r.agent}` : `Workflow: ${r.workflow}`}</div>
                          <div className="text-gray-400">{new Date(r.timestamp).toLocaleString()}</div>
                          {r.prompt && <div className="text-gray-300 mt-1">Prompt: {r.prompt}</div>}
                          {r.final && <div className="text-gray-300 mt-1 truncate">Final: {r.final.slice(0, 120)}{r.final.length>120?'…':''}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={async () => {
                              if (streaming) return;
                              if (r.type === 'agent' && r.agent) {
                                setAgent(r.agent);
                                setPrompt(r.prompt || prompt);
                                await runAgent();
                              } else if (r.type === 'workflow' && r.workflow) {
                                setSelectedWorkflow(r.workflow);
                                // Trigger workflow via retry mechanism: set lastRun then retry
                                setLastRun({ type: 'workflow', workflow: r.workflow });
                                await retryRun();
                              }
                            }}
                          >
                            <RotateCw className="w-4 h-4 mr-1" /> Replay
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
