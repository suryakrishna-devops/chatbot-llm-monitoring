from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq
import logging

from config import settings
from langfuse_client import create_trace, create_generation, finish_generation, score_trace

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_MODELS = {"llama-3.3-70b-versatile", "mixtral-8x7b-32768"}

groq_client = Groq(api_key=settings.groq_api_key)


class ChatRequest(BaseModel):
    message: str
    model: str = "llama-3.3-70b-versatile"
    session_id: str


class ChatResponse(BaseModel):
    response: str
    model: str
    session_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if req.model not in ALLOWED_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Model '{req.model}' not allowed. Choose from: {ALLOWED_MODELS}",
        )

    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    trace = None
    generation = None
    try:
        trace = create_trace(req.session_id, req.message)
        generation = create_generation(trace, req.model, req.message)

        completion = groq_client.chat.completions.create(
            model=req.model,
            messages=[{"role": "user", "content": req.message}],
            max_tokens=1024,
        )
        response_text = completion.choices[0].message.content

        finish_generation(generation, response_text, req.model)
        score_trace(trace, value=1.0)

        return ChatResponse(
            response=response_text,
            model=req.model,
            session_id=req.session_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error during chat: %s", e, exc_info=True)
        if generation:
            try:
                finish_generation(generation, f"ERROR: {e}", req.model)
                score_trace(trace, value=0.0)
            except Exception:
                pass
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")
