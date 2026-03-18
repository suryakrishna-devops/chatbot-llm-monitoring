# AI Chatbot with Langfuse Observability

A full-stack AI chatbot built with FastAPI, React, Groq, and self-hosted Langfuse — all containerized with Docker Compose.

## Architecture

| Service | URL | Description |
|---|---|---|
| Frontend (React) | http://localhost:5173 | WhatsApp-style chat UI |
| Backend (FastAPI) | http://localhost:8000 | REST API + Groq integration |
| Langfuse UI | http://localhost:3000 | Trace viewer & analytics |
| PostgreSQL | internal | Langfuse data store |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2
- [Groq API key](https://console.groq.com) (free tier available)

## Setup

### 1. Clone / enter the project

```bash
cd chatbot
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
# Required — get from https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here

# Generate secure secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
SALT=$(openssl rand -base64 32)
```

The Langfuse keys (`LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY`) are created **after** the first run — see step 4.

### 3. Start all services

```bash
docker compose up --build
```

This starts PostgreSQL → Langfuse → Backend → Frontend in the correct dependency order (health-checked).

First boot takes ~2 minutes while images download and Langfuse initializes.

### 4. Create a Langfuse project and API keys

1. Open http://localhost:3000
2. Register a new account (any email/password — it's self-hosted)
3. Create an **Organization** and a **Project**
4. Go to **Settings → API Keys** → create a new key pair
5. Copy the `pk-lf-...` and `sk-lf-...` values into your `.env`:

```env
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
```

6. Restart the backend:

```bash
docker compose restart backend
```

### 5. Start chatting

Open http://localhost:5173 and send a message.

---

## Viewing Traces in Langfuse

Every message sent through the chatbot is automatically traced:

1. Open http://localhost:3000
2. Navigate to **Traces** in the left sidebar
3. Click any trace named `chatbot-conversation` to see:
   - Input prompt and AI response
   - Latency (automatically measured)
   - Model used
   - Metadata (message length, response length)
   - Scores (1.0 = success, 0.0 = error)

Sessions group all messages from the same browser tab together via a UUID session ID.

## Switching Models

Use the **Model** dropdown in the chat header to switch between:

| Model | Best for |
|---|---|
| `llama-3.3-70b-versatile` | General conversation, reasoning |
| `mixtral-8x7b-32768` | Long context, multilingual |

The selected model is sent with every request and recorded in the Langfuse trace.

## API Reference

### POST /api/chat

```json
{
  "message": "Hello, how are you?",
  "model": "llama-3.3-70b-versatile",
  "session_id": "uuid-string"
}
```

**Response:**

```json
{
  "response": "I'm doing great, thanks for asking!",
  "model": "llama-3.3-70b-versatile",
  "session_id": "uuid-string"
}
```

### GET /health

Returns `{"status": "ok"}` when the backend is running.

## Stopping

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

## Project Structure

```
chatbot/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Env var settings
│   ├── langfuse_client.py   # Trace/generation helpers
│   └── routes/
│       └── chat.py          # POST /api/chat
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── ChatWindow.jsx
        │   ├── MessageInput.jsx
        │   └── ModelSwitcher.jsx
        └── api/
            └── chat.js
```
# chatbot-llm-monitoring
