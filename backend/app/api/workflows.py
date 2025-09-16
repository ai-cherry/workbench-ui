"""Workflow endpoints."""
from __future__ import annotations

import asyncio
import json
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import JSONResponse, StreamingResponse

from app.core.config import SAFE_MODE_DEFAULT
from app.core.pii import mask_text
from app.core.workflows import load_workflows, workflow_summary
from app.security.auth import get_current_user

router = APIRouter()

_AGENT_MAP: Dict[str, str] = {
    "architect": "orchestrator",
    "coder": "developer",
    "reviewer": "monitor",
    "tester": "developer",
}


@router.get("/agent/workflow/list")
async def list_workflows(current_user: str = Depends(get_current_user)) -> JSONResponse:
    """List workflow definitions configured for the system."""

    return JSONResponse(workflow_summary())


@router.post("/agent/workflow/execute")
async def execute_workflow(name: str, current_user: str = Depends(get_current_user)) -> StreamingResponse:
    """Execute a workflow defined in the Agno configuration."""

    workflows = load_workflows()
    if name not in workflows:
        raise HTTPException(status_code=404, detail=f"Workflow not found: {name}")

    steps = workflows[name].get("steps") or []

    async def stream_workflow() -> Any:
        from app.agents.sophia_controller import get_agent

        yield "event: open\n"
        yield "data: {}\n\n"
        yield "event: thinking\n"
        yield f"data: {json.dumps({'text': f'Running workflow: {name}'})}\n\n"
        yield "event: hb\n"
        yield "data: {}\n\n"

        for index, step in enumerate(steps, start=1):
            agent_key = str(step.get("agent", "developer")).lower()
            mapped_agent = _AGENT_MAP.get(agent_key, "developer")
            action = step.get("action", "default")
            try:
                yield "event: step_start\n"
                yield f"data: {json.dumps({'index': index, 'agent': mapped_agent, 'action': action})}\n\n"
                agent = get_agent(mapped_agent)
                prompt = f"Action: {action}. Please perform this step and return a concise result."
                context = {"safe_mode": True} if SAFE_MODE_DEFAULT else None
                response = await agent.arun(prompt, stream=True, context=context)
                for token in response.get("tokens", []):
                    yield f"data: {json.dumps({'token': mask_text(token)})}\n\n"
                yield f"data: {json.dumps({'content': mask_text(response.get('content', ''))})}\n\n"
                yield "event: step_end\n"
                yield f"data: {json.dumps({'index': index, 'status': 'ok'})}\n\n"
            except Exception as exc:
                yield "event: error\n"
                yield f"data: {json.dumps({'error': mask_text(str(exc)), 'index': index})}\n\n"
                break
        yield "event: done\n"
        yield "data: {}\n\n"
        yield "event: end\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_workflow(), media_type="text/event-stream")


__all__ = ["router"]
