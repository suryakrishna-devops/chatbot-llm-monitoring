from langfuse import Langfuse
from config import settings

_client: Langfuse | None = None


def get_langfuse() -> Langfuse:
    global _client
    if _client is None:
        _client = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
        )
    return _client


def create_trace(session_id: str, user_message: str):
    lf = get_langfuse()
    trace = lf.trace(
        name="chatbot-conversation",
        user_id=session_id,
        session_id=session_id,
        input=user_message,
    )
    return trace


def create_generation(trace, model: str, prompt: str):
    generation = trace.generation(
        name="groq-completion",
        model=model,
        input=[{"role": "user", "content": prompt}],
        metadata={
            "model": model,
            "message_length": len(prompt),
        },
    )
    return generation


def finish_generation(generation, response_text: str, model: str):
    generation.end(
        output=response_text,
        metadata={
            "response_length": len(response_text),
        },
    )


def score_trace(trace, value: float = 1.0):
    lf = get_langfuse()
    lf.score(
        trace_id=trace.id,
        name="completion-success",
        value=value,
    )
