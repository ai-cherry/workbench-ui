"""GraphQL schema and router."""
from __future__ import annotations

from typing import List, Optional

import strawberry
from strawberry.fastapi import GraphQLRouter

from app.api.health import collect_health_status


@strawberry.type
class Service:
    id: str
    name: str
    status: str
    url: Optional[str]


@strawberry.type
class SystemHealth:
    status: str
    timestamp: str
    services: List[Service]


@strawberry.type
class Query:
    @strawberry.field
    async def system_health(self) -> SystemHealth:
        payload = await collect_health_status()
        services = [
            Service(
                id=service_id,
                name=data.get("name"),
                status=data.get("status"),
                url=data.get("url"),
            )
            for service_id, data in payload.get("services", {}).items()
        ]
        return SystemHealth(
            status=payload.get("status", "unknown"),
            timestamp=payload.get("timestamp", ""),
            services=services,
        )


schema = strawberry.Schema(query=Query)
router = GraphQLRouter(schema)


__all__ = ["router", "schema"]
