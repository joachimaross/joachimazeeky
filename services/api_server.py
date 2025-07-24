"""services.api_server
FastAPI service exposing Zeeky chat functionality over HTTP.

Run with:
    uvicorn services.api_server:app --reload --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import uuid
from typing import Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from zeeky import ZeekyAssistant

app = FastAPI(title="Zeeky API", version="0.1.0")

# ---------------------------------------------------------------------------
# CORS (allow localhost web app by default)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this list.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory session storage: {session_id: ZeekyAssistant}
# ---------------------------------------------------------------------------
_sessions: Dict[str, ZeekyAssistant] = {}


class ChatRequest(BaseModel):
    session_id: str | None = Field(
        default=None, description="Opaque session identifier. If omitted a new session is created."
    )
    message: str = Field(..., description="The user's message to Zeeky.")


class ChatResponse(BaseModel):
    session_id: str = Field(..., description="Session identifier to use for subsequent calls.")
    reply: str = Field(..., description="Zeeky's response to the user.")


@app.get("/health", tags=["utility"])
def health() -> dict[str, str]:
    """Health-check endpoint."""
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse, tags=["chat"])
async def chat(request: ChatRequest) -> ChatResponse:
    """Handle a chat message and return the assistant's reply."""
    if request.session_id and request.session_id in _sessions:
        assistant = _sessions[request.session_id]
    elif request.session_id:
        raise HTTPException(status_code=404, detail="Invalid session_id")
    else:
        # Create new session
        request.session_id = uuid.uuid4().hex
        assistant = ZeekyAssistant()
        _sessions[request.session_id] = assistant

    reply = await _run_in_threadpool(assistant.chat, request.message)
    return ChatResponse(session_id=request.session_id, reply=reply)


# ---------------------------------------------------------------------------
# Helper – run sync code without blocking the event loop
# ---------------------------------------------------------------------------
import functools
from concurrent.futures import ThreadPoolExecutor
from fastapi.concurrency import run_in_threadpool as _run_in_threadpool


__all__ = ["app"]