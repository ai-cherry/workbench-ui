'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Activity, GitBranch, Server, Terminal, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomePage() {
  const [mcpStatus, setMcpStatus] = useState<Record<string, boolean>>({});
  const [githubConnected, setGithubConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSystemStatus();
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
          statusMap[key] = value.status === 'connected';
        });
        setMcpStatus(statusMap);
      }

      // Check GitHub connection
      setGithubConnected(!!process.env.NEXT_PUBLIC_GITHUB_PAT);
      
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
        <Tabs defaultValue="servers" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="servers">MCP Servers</TabsTrigger>
            <TabsTrigger value="repositories">Repositories</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

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
                    onClick={() => toast.info('Opening terminal...')}
                    className="w-full bg-gray-600 hover:bg-gray-700"
                  >
                    <Terminal className="mr-2 h-4 w-4" />
                    Open Terminal
                  </Button>
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