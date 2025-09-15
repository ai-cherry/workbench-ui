/**
 * Health Dashboard Component
 * Real-time monitoring dashboard for Sophia Intel AI unified system
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Server, 
  Database,
  GitBranch,
  Search,
  HardDrive,
  Cpu,
  MemoryStick,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Play,
  Square,
  RotateCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface ServiceHealth {
  id: string;
  name: string;
  type: 'memory' | 'filesystem' | 'git' | 'vector' | 'redis' | 'ui';
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  uptime: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  lastCheck: string;
  endpoint: string;
  port: number;
  details?: {
    requestCount?: number;
    errorCount?: number;
    activeConnections?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
}

interface SystemMetrics {
  totalRequests: number;
  totalErrors: number;
  avgResponseTime: number;
  uptime: number;
  services: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  service: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

// Service Icons
const ServiceIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'memory':
      return <Database className="w-5 h-5" />;
    case 'filesystem':
      return <HardDrive className="w-5 h-5" />;
    case 'git':
      return <GitBranch className="w-5 h-5" />;
    case 'vector':
      return <Search className="w-5 h-5" />;
    case 'redis':
      return <Server className="w-5 h-5" />;
    case 'ui':
      return <Activity className="w-5 h-5" />;
    default:
      return <Server className="w-5 h-5" />;
  }
};

// Status Badge
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4" />;
      case 'unhealthy':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <Badge className={cn('flex items-center gap-1', getStatusColor())}>
      {getStatusIcon()}
      <span className="capitalize">{status}</span>
    </Badge>
  );
};

// Main Component
export function HealthDashboard() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch health data
  const fetchHealthData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/mcp/health');
      if (response.ok) {
        const data = await response.json();
        
        // Transform API data to component format
        const serviceData: ServiceHealth[] = [
          {
            id: 'redis',
            name: 'Redis Cache',
            type: 'redis',
            status: data.redis?.status || 'unknown',
            uptime: Date.now() - new Date(data.redis?.startTime || Date.now()).getTime(),
            responseTime: data.redis?.responseTime || 0,
            errorRate: 0,
            throughput: 0,
            lastCheck: new Date().toISOString(),
            endpoint: 'localhost',
            port: 6379
          },
          {
            id: 'memory',
            name: 'Memory Service',
            type: 'memory',
            status: data.services?.memory?.status || 'unknown',
            uptime: Date.now() - new Date(data.services?.memory?.startTime || Date.now()).getTime(),
            responseTime: data.services?.memory?.responseTime || 0,
            errorRate: 0,
            throughput: 0,
            lastCheck: new Date().toISOString(),
            endpoint: 'localhost',
            port: 8081,
            details: data.services?.memory?.details
          },
          {
            id: 'filesystem',
            name: 'Filesystem Service',
            type: 'filesystem',
            status: data.services?.filesystem?.status || 'unknown',
            uptime: Date.now() - new Date(data.services?.filesystem?.startTime || Date.now()).getTime(),
            responseTime: data.services?.filesystem?.responseTime || 0,
            errorRate: 0,
            throughput: 0,
            lastCheck: new Date().toISOString(),
            endpoint: 'localhost',
            port: 8082,
            details: data.services?.filesystem?.details
          },
          {
            id: 'git',
            name: 'Git Service',
            type: 'git',
            status: data.services?.git?.status || 'unknown',
            uptime: Date.now() - new Date(data.services?.git?.startTime || Date.now()).getTime(),
            responseTime: data.services?.git?.responseTime || 0,
            errorRate: 0,
            throughput: 0,
            lastCheck: new Date().toISOString(),
            endpoint: 'localhost',
            port: 8084,
            details: data.services?.git?.details
          },
          {
            id: 'vector',
            name: 'Vector Service',
            type: 'vector',
            status: data.services?.vector?.status || 'unknown',
            uptime: Date.now() - new Date(data.services?.vector?.startTime || Date.now()).getTime(),
            responseTime: data.services?.vector?.responseTime || 0,
            errorRate: 0,
            throughput: 0,
            lastCheck: new Date().toISOString(),
            endpoint: 'localhost',
            port: 8085,
            details: data.services?.vector?.details
          },
          {
            id: 'ui',
            name: 'UI Service',
            type: 'ui',
            status: 'healthy',
            uptime: Date.now() - new Date(data.startTime || Date.now()).getTime(),
            responseTime: data.responseTime || 0,
            errorRate: 0,
            throughput: 0,
            lastCheck: new Date().toISOString(),
            endpoint: 'localhost',
            port: 3000
          }
        ];

        setServices(serviceData);

        // Calculate metrics
        const healthyCount = serviceData.filter(s => s.status === 'healthy').length;
        const degradedCount = serviceData.filter(s => s.status === 'degraded').length;
        const unhealthyCount = serviceData.filter(s => s.status === 'unhealthy').length;

        setMetrics({
          totalRequests: data.totalRequests || 0,
          totalErrors: data.totalErrors || 0,
          avgResponseTime: serviceData.reduce((acc, s) => acc + s.responseTime, 0) / serviceData.length,
          uptime: Date.now() - new Date(data.startTime || Date.now()).getTime(),
          services: {
            total: serviceData.length,
            healthy: healthyCount,
            degraded: degradedCount,
            unhealthy: unhealthyCount
          }
        });

        // Generate alerts for unhealthy services
        const newAlerts: Alert[] = serviceData
          .filter(s => s.status !== 'healthy')
          .map(s => ({
            id: `alert-${s.id}-${Date.now()}`,
            severity: s.status === 'unhealthy' ? 'critical' : 'medium',
            service: s.name,
            message: `Service ${s.name} is ${s.status}`,
            timestamp: new Date().toISOString(),
            resolved: false
          }));

        setAlerts(prev => [...newAlerts, ...prev.filter(a => !a.resolved)].slice(0, 10));
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh
  useEffect(() => {
    fetchHealthData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchHealthData]);

  // Format uptime
  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Service actions
  const restartService = async (serviceId: string) => {
    try {
      const response = await fetch(`/api/mcp/services/${serviceId}/restart`, {
        method: 'POST'
      });
      if (response.ok) {
        await fetchHealthData();
      }
    } catch (error) {
      console.error(`Failed to restart service ${serviceId}:`, error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sophia Intel AI Health Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of all system components
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Last Update: {lastUpdate.toLocaleTimeString()}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(autoRefresh && 'bg-green-50')}
          >
            {autoRefresh ? (
              <>
                <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                Auto Refresh On
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Auto Refresh Off
              </>
            )}
          </Button>
          <Button onClick={fetchHealthData} disabled={isRefreshing}>
            <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.services.healthy === metrics.services.total ? (
                  <span className="text-green-600">All Healthy</span>
                ) : (
                  <span className="text-yellow-600">Degraded</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.services.healthy}/{metrics.services.total} services operational
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatUptime(metrics.uptime)}</div>
              <p className="text-xs text-muted-foreground">
                System running since {new Date(Date.now() - metrics.uptime).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avgResponseTime.toFixed(2)}ms</div>
              <p className="text-xs text-muted-foreground">
                Average across all services
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.totalRequests > 0 
                  ? ((metrics.totalErrors / metrics.totalRequests) * 100).toFixed(2)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.totalErrors} errors / {metrics.totalRequests} requests
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {alerts.filter(a => !a.resolved).length > 0 && (
              <Badge className="ml-2" variant="destructive">
                {alerts.filter(a => !a.resolved).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(service => (
              <Card 
                key={service.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-lg',
                  selectedService === service.id && 'ring-2 ring-primary'
                )}
                onClick={() => setSelectedService(service.id === selectedService ? null : service.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ServiceIcon type={service.type} />
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                    </div>
                    <StatusBadge status={service.status} />
                  </div>
                  <CardDescription>
                    {service.endpoint}:{service.port}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Uptime</span>
                      <span className="font-medium">{formatUptime(service.uptime)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Response Time</span>
                      <span className="font-medium">{service.responseTime}ms</span>
                    </div>
                    {service.details && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Requests</span>
                          <span className="font-medium">{service.details.requestCount || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Errors</span>
                          <span className="font-medium text-red-600">
                            {service.details.errorCount || 0}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {selectedService === service.id && (
                    <div className="mt-4 pt-4 border-t flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          restartService(service.id);
                        }}
                      >
                        <RotateCw className="w-4 h-4 mr-1" />
                        Restart
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          // View logs implementation
                        }}
                      >
                        <Info className="w-4 h-4 mr-1" />
                        View Logs
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">No Active Alerts</p>
                <p className="text-sm text-muted-foreground">All systems operating normally</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => (
                <Card key={alert.id} className={cn(
                  'border-l-4',
                  alert.severity === 'critical' && 'border-l-red-500',
                  alert.severity === 'high' && 'border-l-orange-500',
                  alert.severity === 'medium' && 'border-l-yellow-500',
                  alert.severity === 'low' && 'border-l-blue-500'
                )}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {alert.severity === 'critical' ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : alert.severity === 'high' ? (
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-sm text-muted-foreground">
                            {alert.service} • {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {!alert.resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAlerts(prev => 
                              prev.map(a => a.id === alert.id ? { ...a, resolved: true } : a)
                            );
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map(service => service.details && (
              <Card key={service.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ServiceIcon type={service.type} />
                    {service.name} Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {service.details.memoryUsage && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Memory Usage</span>
                          <span className="font-medium">
                            {(service.details.memoryUsage / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min((service.details.memoryUsage / 1024 / 1024 / 100) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {service.details.cpuUsage !== undefined && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">CPU Usage</span>
                          <span className="font-medium">{service.details.cpuUsage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={cn(
                              'h-2 rounded-full',
                              service.details.cpuUsage < 50 && 'bg-green-600',
                              service.details.cpuUsage >= 50 && service.details.cpuUsage < 80 && 'bg-yellow-600',
                              service.details.cpuUsage >= 80 && 'bg-red-600'
                            )}
                            style={{ width: `${service.details.cpuUsage}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {service.details.activeConnections !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Active Connections</span>
                        <span className="font-medium">{service.details.activeConnections}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}