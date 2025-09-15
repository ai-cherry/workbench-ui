import { NextResponse } from 'next/server';

interface TestEndpoint {
  name: string;
  method: string;
  path: string;
  body?: any;
}

const TEST_ENDPOINTS: Record<string, TestEndpoint[]> = {
  memory: [
    { name: 'Store', method: 'POST', path: '/sessions/test/memory', body: { content: 'test', role: 'user' } },
    { name: 'Retrieve', method: 'GET', path: '/sessions/test/memory' },
    { name: 'Search', method: 'POST', path: '/search', body: { query: 'test' } },
    { name: 'Clear', method: 'DELETE', path: '/sessions/test/memory' }
  ],
  filesystem: [
    { name: 'List', method: 'POST', path: '/fs/list', body: { path: '.' } },
    { name: 'Read', method: 'POST', path: '/fs/read', body: { path: 'README.md' } },
    { name: 'Search', method: 'POST', path: '/repo/search', body: { query: 'test', limit: 5 } }
  ],
  git: [
    { name: 'Status', method: 'GET', path: '/status' },
    { name: 'Log', method: 'GET', path: '/log?limit=5' },
    { name: 'Branches', method: 'GET', path: '/branches' }
  ],
  vector: [
    { name: 'Index', method: 'POST', path: '/index', body: { content: 'test content', metadata: { source: 'test' } } },
    { name: 'Search', method: 'POST', path: '/search', body: { query: 'test', limit: 5 } }
  ]
};

const SERVERS = [
  { name: 'memory', port: 8081 },
  { name: 'filesystem', port: 8082 },
  { name: 'git', port: 8084 },
  { name: 'vector', port: 8085 }
];

export async function POST() {
  const results: Record<string, any> = {};
  
  for (const server of SERVERS) {
    const serverResults: any[] = [];
    const endpoints = TEST_ENDPOINTS[server.name] || [];
    
    for (const endpoint of endpoints) {
      try {
        const url = `http://localhost:${server.port}${endpoint.path}`;
        const options: RequestInit = {
          method: endpoint.method,
          headers: {
            'Authorization': 'Bearer dev-token',
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        };
        
        if (endpoint.body && endpoint.method !== 'GET') {
          options.body = JSON.stringify(endpoint.body);
        }
        
        const response = await fetch(url, options);
        
        serverResults.push({
          endpoint: endpoint.name,
          method: endpoint.method,
          path: endpoint.path,
          status: response.status,
          success: response.ok,
          message: response.ok ? 'OK' : `HTTP ${response.status}`
        });
      } catch (error) {
        serverResults.push({
          endpoint: endpoint.name,
          method: endpoint.method,
          path: endpoint.path,
          status: 0,
          success: false,
          message: error instanceof Error ? error.message : 'Failed'
        });
      }
    }
    
    results[server.name] = {
      port: server.port,
      tests: serverResults,
      passed: serverResults.filter(t => t.success).length,
      failed: serverResults.filter(t => !t.success).length,
      total: serverResults.length
    };
  }
  
  // Calculate overall statistics
  const totalTests = Object.values(results).reduce((sum: number, s: any) => sum + s.total, 0);
  const passedTests = Object.values(results).reduce((sum: number, s: any) => sum + s.passed, 0);
  const failedTests = Object.values(results).reduce((sum: number, s: any) => sum + s.failed, 0);
  
  return NextResponse.json({
    status: failedTests === 0 ? 'success' : 'partial',
    results,
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : '0'
    },
    timestamp: new Date().toISOString()
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}