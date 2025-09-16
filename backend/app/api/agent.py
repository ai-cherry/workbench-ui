"""Agent execution endpoints."""
from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import APIRouter, Depends
from starlette.responses import JSONResponse, StreamingResponse

from app.core.config import SAFE_MODE_DEFAULT
from app.core.pii import mask_text
from app.schemas import AgentRequest
from app.security.auth import get_current_user

router = APIRouter()


@router.post("/agent/execute")
async def execute_agent(
    request: AgentRequest,
    current_user: str = Depends(get_current_user),
):
    """Execute an agent with optional server-sent event streaming."""

    async def stream_response() -> Any:
        from app.agents.sophia_controller import get_agent

        agent = get_agent(request.agent)
        yield "event: open\n"
        yield "data: {}\n\n"
        yield "event: thinking\n"
        yield f"data: {json.dumps({'text': f'Analyzing request with {request.agent} agent...'})}\n\n"
        try:
            yield "event: hb\n"
            yield "data: {}\n\n"
            user_message = request.messages[-1].content if request.messages else ""
            context = request.context or {}
            if SAFE_MODE_DEFAULT:
                context = dict(context)
                context["safe_mode"] = True
            response = await agent.arun(
                user_message,
                stream=request.stream,
                context=context,
            )
            if request.stream:
                for token in response.get("tokens", []):
                    yield f"data: {json.dumps({'token': mask_text(token)})}\n\n"
                    await asyncio.sleep(0.01)
            for tool_call in response.get("tool_calls", []):
                yield "event: tool_start\n"
                yield f"data: {json.dumps(tool_call)}\n\n"
                await asyncio.sleep(0.1)
                yield "event: tool_end\n"
                yield f"data: {json.dumps(tool_call)}\n\n"
            final_content = mask_text(response.get("content", ""))
            yield f"data: {json.dumps({'content': final_content})}\n\n"
        except Exception as exc:
            yield "event: error\n"
            yield f"data: {json.dumps({'error': mask_text(str(exc))})}\n\n"
        yield "event: done\n"
        yield "data: {}\n\n"
        yield "event: end\n"
        yield "data: [DONE]\n\n"

    if request.stream:
        return StreamingResponse(stream_response(), media_type="text/event-stream")

    from app.agents.sophia_controller import get_agent

    agent = get_agent(request.agent)
    user_message = request.messages[-1].content if request.messages else ""
    response = await agent.arun(user_message, stream=False, context=request.context)
    return JSONResponse(response)


__all__ = ["router"]
