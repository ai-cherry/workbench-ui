# MCP Port Reference

The Workbench UI, Sophia backend, and auxiliary tooling share a common set of Model Context Protocol (MCP) port assignments. Update this file if the defaults ever change so other docs can link to a single source of truth.

## Default Ports & Environment Variables

| Service      | Port | Environment Variable        |
|--------------|------|-----------------------------|
| Memory       | 8081 | `MCP_MEMORY_PORT`           |
| Filesystem   | 8082 | `MCP_FILESYSTEM_PORT`       |
| Analytics    | 8083 | `MCP_ANALYTICS_PORT` (optional) |
| Git          | 8084 | `MCP_GIT_PORT`              |
| Vector       | 8085 | `MCP_VECTOR_PORT` or `MCP_UNIFIED_PORT` |

## Example `.env` Snippet

```env
MCP_MEMORY_PORT=8081
MCP_FILESYSTEM_PORT=8082
MCP_ANALYTICS_PORT=8083
MCP_GIT_PORT=8084
MCP_VECTOR_PORT=8085
```

> The setup script copies these values into `.env.local` and the Sophia backend consumes the same defaults via `.env.master`. Override them only when your MCP servers listen on different ports.
