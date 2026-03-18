from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from routes.chat import router as chat_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="AI Chatbot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
