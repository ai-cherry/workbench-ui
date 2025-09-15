import { NextResponse } from 'next/server';

const MCP_SERVERS = [
  { name: 'memory', port: 8081 },
  { name: 'filesystem', port: 8082 },
  { name: 'git', port: 8084 },
  { name: 'vector', port: 8085 }
];

export async function GET() {
  const results: Record<string, any> = {};
  
  for (const server of MCP_SERVERS) {
    try {
      const response = await fetch(`http://localhost:${server.port}/health`, {
        headers: { 
          'Authorization': 'Bearer dev-token',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        results[server.name] = {
          port: server.port,
          status: data.status || 'ok',
          healthy: true,
          details: data
        };
      } else {
        results[server.name] = {
          port: server.port,
          status: 'error',
          healthy: false,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      results[server.name] = {
        port: server.port,
        status: 'offline',
        healthy: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }
  
  // Overall status
  const allHealthy = Object.values(results).every((s: any) => 
    s.healthy || s.status === 'degraded'
  );
  
  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    servers: results,
    timestamp: new Date().toISOString()
  });
}

// Support OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}