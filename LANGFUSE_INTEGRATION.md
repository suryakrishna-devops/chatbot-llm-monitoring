# Langfuse Integration — AI Chatbot Technical Documentation

A complete technical reference for the AI Chatbot with LLM Observability project. This document covers architecture, containerization, Langfuse tracing, request flow, troubleshooting, and operational guidance.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Docker Containerization](#3-docker-containerization)
4. [Langfuse Integration](#4-langfuse-integration)
5. [Request Flow](#5-how-the-app-works-request-flow)
6. [Environment Variables](#6-environment-variables)
7. [Common Issues & Fixes](#7-common-issues--fixes)
8. [Langfuse Dashboard Guide](#8-langfuse-dashboard-guide)
9. [How to Run This Project](#9-how-to-run-this-project)
10. [Why Langfuse?](#10-why-langfuse-benefits)

---

## 1. Project Overview

This project is a **full-stack AI chatbot** with built-in **LLM observability** — every message sent through the UI is traced end-to-end in Langfuse, giving you full visibility into model behavior, latency, and session history.

### What It Does

- Users chat with an AI via a WhatsApp-style React interface
- The backend calls the **Groq API** (fast, free inference) with the selected model
- Every message is automatically traced in **self-hosted Langfuse** — input, output, latency, model name, session, and score
- The Langfuse dashboard at `http://localhost:3000` shows all traces, generations, and analytics

### Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + Vite → served by Nginx | Chat UI, model switcher |
| Backend | FastAPI (Python 3.11) | REST API, Groq integration, Langfuse tracing |
| AI Provider | Groq API | LLM inference (free, fast) |
| Models | `llama-3.3-70b-versatile`, `mixtral-8x7b-32768` | Selectable from UI |
| Observability | Langfuse v2 (self-hosted) | Trace every LLM call |
| Database | PostgreSQL 15 | Langfuse data persistence |
| Containerization | Docker Compose | One-command deployment |

### Project File Structure

```
chatbot/
├── docker-compose.yml          # All 4 services defined here
├── .env                        # Your real secrets (never commit)
├── .env.example                # Template for new developers
├── LANGFUSE_INTEGRATION.md     # This document
├── README.md                   # Quick-start guide
│
├── backend/
│   ├── Dockerfile              # python:3.11-slim base
│   ├── requirements.txt        # fastapi, groq, langfuse, etc.
│   ├── main.py                 # FastAPI app, CORS, /health
│   ├── config.py               # Pydantic settings from env vars
│   ├── langfuse_client.py      # Trace/generation/score helpers
│   └── routes/
│       └── chat.py             # POST /api/chat endpoint
│
└── frontend/
    ├── Dockerfile              # Multi-stage: Vite build → Nginx
    ├── nginx.conf              # SPA routing + /api proxy
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx             # Main app, state management
        ├── index.css           # Dark theme, animations
        ├── api/
        │   └── chat.js         # fetch() wrapper for /api/chat
        └── components/
            ├── ChatWindow.jsx  # Message bubbles, auto-scroll
            ├── MessageInput.jsx # Textarea + send button
            └── ModelSwitcher.jsx # Model dropdown
```

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Host Machine                              │
│                                                                  │
│   Browser                                                        │
│   └─► http://localhost:5173                                      │
│                                                                  │
│  ┌──────────────────── Docker Network: chatbot-net ───────────┐  │
│  │                                                            │  │
│  │  ┌──────────────────┐        ┌──────────────────────────┐  │  │
│  │  │   frontend       │        │       backend            │  │  │
│  │  │  (Nginx + React) │        │  (FastAPI / Python)      │  │  │
│  │  │                  │        │                          │  │  │
│  │  │  Port: 5173→80   │──/api/─►  Port: 8000             │  │  │
│  │  │                  │        │                          │  │  │
│  │  │  • Serves React  │        │  • POST /api/chat        │  │  │
│  │  │    build (dist/) │        │  • GET  /health          │  │  │
│  │  │  • Proxies /api  │        │  • Calls Groq API        │  │  │
│  │  │    to backend    │        │  • Creates LF traces     │  │  │
│  │  └──────────────────┘        └──────────┬───────────────┘  │  │
│  │                                         │                  │  │
│  │                         ┌───────────────┼──────────────┐   │  │
│  │                         │               │              │   │  │
│  │                         ▼               ▼              │   │  │
│  │             ┌────────────────┐    ┌─────────────────┐  │   │  │
│  │             │langfuse-server │    │   GROQ API      │  │   │  │
│  │             │  (Next.js)     │    │  (External)     │  │   │  │
│  │             │                │    │                 │  │   │  │
│  │             │  Port: 3000    │    │  api.groq.com   │  │   │  │
│  │             │                │    │  llama-3.3-70b  │  │   │  │
│  │             │  • Trace UI    │    │  mixtral-8x7b   │  │   │  │
│  │             │  • REST API    │    └─────────────────┘  │   │  │
│  │             │  • Dashboard   │          (HTTPS)        │   │  │
│  │             └───────┬────────┘                         │   │  │
│  │                     │                                  │   │  │
│  │                     ▼                                  │   │  │
│  │             ┌────────────────┐                         │   │  │
│  │             │   postgres     │                         │   │  │
│  │             │  (PostgreSQL)  │                         │   │  │
│  │             │                │                         │   │  │
│  │             │  Port: 5432    │                         │   │  │
│  │             │  (internal)    │                         │   │  │
│  │             │                │                         │   │  │
│  │             │  Volume:       │                         │   │  │
│  │             │  postgres_data │                         │   │  │
│  │             └────────────────┘                         │   │  │
│  │                                                        │   │  │
│  └────────────────────────────────────────────────────────┘   │  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Port Mapping Summary:
  localhost:5173  →  frontend container :80    (public)
  localhost:8000  →  backend container  :8000  (public, for dev/debug)
  localhost:3000  →  langfuse container :3000  (public, dashboard)
  postgres :5432  →  internal only              (not exposed to host)

Internal communication uses Docker hostnames (container names):
  frontend  → http://backend:8000
  backend   → http://langfuse-server:3000
  langfuse  → postgresql://postgres:5432/langfuse
```

---

## 3. Docker Containerization

### 3.1 docker-compose.yml Structure

The compose file defines 4 services that start in strict dependency order:

```
postgres  →  langfuse-server  →  backend  →  frontend
```

Each service waits for the previous one to pass its health check before starting. This guarantees:
- Langfuse has a working database before it boots
- The backend can connect to Langfuse on startup
- The frontend only serves once the API is ready

### 3.2 Service-by-Service Breakdown

#### `postgres` — Database

```yaml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_DB: langfuse
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 10s
    timeout: 5s
    retries: 5
```

**Why `postgres:15-alpine`?**
Alpine Linux base keeps the image small (~80MB vs ~400MB for the full image). It includes everything PostgreSQL needs with no extra OS packages.

**Why a named volume `postgres_data`?**
Without a volume, all Langfuse data (traces, users, projects) is deleted when the container is removed (`docker compose down`). The named volume persists data on the host at `/var/lib/docker/volumes/chatbot_postgres_data/`.

**Health check:** `pg_isready` is a built-in PostgreSQL utility that returns exit code `0` only when the database is accepting connections. Downstream services wait for this before starting.

---

#### `langfuse-server` — Observability UI + API

```yaml
langfuse-server:
  image: langfuse/langfuse:2
  depends_on:
    postgres:
      condition: service_healthy
  environment:
    DATABASE_URL: ${DATABASE_URL}
    NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
    SALT: ${SALT}
    NEXTAUTH_URL: http://localhost:3000
    HOSTNAME: "0.0.0.0"          # Critical — see Issue #1 below
  healthcheck:
    test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:3000/api/public/health || exit 1"]
    interval: 10s
    timeout: 10s
    retries: 15
    start_period: 60s
```

**Key environment variables:**
- `DATABASE_URL` — full PostgreSQL connection string for Langfuse's Prisma ORM
- `NEXTAUTH_SECRET` — signs authentication session tokens; must be random and secret
- `SALT` — used for hashing API keys stored in the database
- `HOSTNAME: "0.0.0.0"` — forces Next.js to bind on all network interfaces, not just the Docker bridge IP (required for the health check to work via `127.0.0.1`)

**Health check note:** Uses `127.0.0.1` explicitly instead of `localhost`. Inside Docker containers, `localhost` often resolves to `::1` (IPv6) while the server binds on IPv4 `0.0.0.0`. Using the literal IPv4 address avoids "Connection refused" failures.

---

#### `backend` — FastAPI Application

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  depends_on:
    langfuse-server:
      condition: service_healthy
  environment:
    GROQ_API_KEY: ${GROQ_API_KEY}
    LANGFUSE_PUBLIC_KEY: ${LANGFUSE_PUBLIC_KEY}
    LANGFUSE_SECRET_KEY: ${LANGFUSE_SECRET_KEY}
    LANGFUSE_HOST: ${LANGFUSE_HOST}        # http://langfuse-server:3000
  healthcheck:
    test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"]
    interval: 10s
    retries: 5
    start_period: 10s
```

**Why `python` for the health check?**
The `python:3.11-slim` base image does not include `wget` or `curl`. Python's built-in `urllib.request` is always available and makes the HTTP check reliable without adding extra packages.

**Why `depends_on: service_healthy` for langfuse-server?**
The Langfuse Python SDK initializes on startup. If Langfuse isn't ready, SDK initialization fails and all tracing silently stops working. Waiting for `service_healthy` guarantees the SDK can connect immediately.

---

#### `frontend` — React + Nginx

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  depends_on:
    backend:
      condition: service_healthy
  ports:
    - "5173:80"
```

The frontend uses a **multi-stage Dockerfile**:

```dockerfile
# Stage 1: Build React app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build          # outputs to /app/dist

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

This produces a small final image (~25MB) containing only Nginx and the static build output — no Node.js, no `node_modules`.

**Nginx configuration** (`frontend/nginx.conf`):

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # React Router: all unknown paths return index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy /api/* calls to FastAPI backend
    location /api/ {
        proxy_pass http://backend:8000/api/;
    }
}
```

The `/api/` proxy block is why the frontend never makes direct cross-origin requests — all API calls go through Nginx which forwards them internally to `backend:8000`.

---

### 3.3 Docker Internal Networking

#### How Container Names Become Hostnames

When Docker Compose creates a network (`chatbot-net`), it automatically registers each service name as a DNS hostname within that network.

```
Service name in docker-compose.yml → DNS hostname inside network
─────────────────────────────────────────────────────────────────
postgres          →  postgres
langfuse-server   →  langfuse-server
backend           →  backend
frontend          →  frontend
```

This means:
- The backend connects to Langfuse via `http://langfuse-server:3000`
- Langfuse connects to PostgreSQL via `postgresql://postgres:5432/langfuse`
- Nginx proxies to FastAPI via `http://backend:8000`

**Never use `localhost` for inter-container communication.** Inside a container, `localhost` refers to that container itself, not any other service. Using `localhost:3000` inside the backend container would try to connect to port 3000 on the backend itself (which isn't running anything there).

#### The `chatbot-net` Bridge Network

```yaml
networks:
  chatbot-net:
    driver: bridge
```

`bridge` is Docker's default network driver. It creates an isolated virtual network where:
- All containers in `chatbot-net` can reach each other by name
- No external traffic can enter unless a port is explicitly published
- The `postgres` service has no `ports:` mapping — it is only accessible to other containers in `chatbot-net`, not from the host

#### Port Exposure Summary

| Service | Internal Port | Host Port | Accessible From |
|---|---|---|---|
| postgres | 5432 | not exposed | containers only |
| langfuse-server | 3000 | 3000 | host + containers |
| backend | 8000 | 8000 | host + containers |
| frontend | 80 | 5173 | host + containers |

---

### 3.4 Health Checks and Startup Order

Health checks serve two purposes:
1. **Dependency ordering** — `depends_on: condition: service_healthy` won't start a service until the dependency reports healthy
2. **Runtime monitoring** — Docker marks containers as `(healthy)` or `(unhealthy)` in `docker compose ps` output

```
docker compose ps
NAME                        STATUS
chatbot-postgres-1          Up (healthy)
chatbot-langfuse-server-1   Up (healthy)
chatbot-backend-1           Up (healthy)
chatbot-frontend-1          Up
```

The `start_period` setting is critical for Langfuse: it tells Docker to not count health check failures during the first N seconds (while the Next.js server is booting). Without this, Docker marks the container unhealthy before it has a chance to start.

---

## 4. Langfuse Integration

### 4.1 What Langfuse Does in This Project

Langfuse is the observability layer. Every message sent through the chatbot generates:

1. A **Trace** — the top-level container representing one complete user interaction
2. A **Generation** — the specific LLM call inside that trace (model, input, output, latency)
3. A **Score** — a numeric quality signal (1.0 = success, 0.0 = error)

All of this is visible in the Langfuse dashboard at `http://localhost:3000`.

### 4.2 SDK Initialization

The Langfuse Python SDK is initialized in `backend/langfuse_client.py`:

```python
from langfuse import Langfuse
from config import settings

_client: Langfuse | None = None

def get_langfuse() -> Langfuse:
    global _client
    if _client is None:
        _client = Langfuse(
            public_key=settings.langfuse_public_key,   # pk-lf-...
            secret_key=settings.langfuse_secret_key,   # sk-lf-...
            host=settings.langfuse_host,               # http://langfuse-server:3000
        )
    return _client
```

The client uses the three required credentials:
- `public_key` — identifies which Langfuse project receives the traces
- `secret_key` — authenticates the SDK to the Langfuse API
- `host` — points to the **self-hosted** Langfuse server on the Docker network (not `api.langfuse.com`)

### 4.3 How Traces Are Created in Code

The full tracing flow in `backend/routes/chat.py`:

```python
# Step 1: Create a top-level trace for this user interaction
trace = lf.trace(
    name="chatbot-conversation",    # shown in Langfuse Traces tab
    user_id=session_id,             # groups traces by browser session
    session_id=session_id,
    input=user_message,
)

# Step 2: Create a generation span inside the trace
generation = trace.generation(
    name="groq-completion",
    model=model_name,               # e.g. "llama-3.3-70b-versatile"
    input=[{"role": "user", "content": prompt}],
    metadata={
        "model": model_name,
        "message_length": len(prompt),
    },
)

# Step 3: Call the LLM
completion = groq_client.chat.completions.create(
    model=model_name,
    messages=[{"role": "user", "content": prompt}],
    max_tokens=1024,
)
response_text = completion.choices[0].message.content

# Step 4: End the generation — Langfuse calculates latency automatically
generation.end(
    output=response_text,
    metadata={"response_length": len(response_text)},
)

# Step 5: Score the trace (1.0 = success, 0.0 = error)
lf.score(
    trace_id=trace.id,
    name="completion-success",
    value=1.0,
)
```

### 4.4 What Gets Tracked Per Message

| Field | Source | Where to See It |
|---|---|---|
| User prompt | `req.message` | Trace → Input |
| AI response | `completion.choices[0].message.content` | Generation → Output |
| Model name | `req.model` | Generation → Model |
| Latency (ms) | Auto-calculated between `.generation()` and `.end()` | Generation → Latency |
| Session ID | `req.session_id` (UUID from browser) | Trace → User ID / Session |
| Completion score | `1.0` success / `0.0` error | Scores tab |
| Message length | `len(req.message)` | Generation → Metadata |
| Response length | `len(response_text)` | Generation → Metadata |

### 4.5 Asynchronous Trace Upload

The Langfuse SDK does **not** block the API response to upload traces. It batches events in a background thread and flushes them to the Langfuse server periodically. This means:

- The `/api/chat` response returns immediately after the Groq call completes
- Traces appear in the dashboard within a few seconds (not immediately)
- If the backend shuts down before flushing, in-flight traces may be lost

---

## 5. How the App Works (Request Flow)

Here is the complete step-by-step flow when a user sends a message:

```
Step 1: User types "Hello" and clicks Send
        └─► App.jsx calls sendMessage({ message, model, sessionId })

Step 2: Frontend fetch()
        POST http://localhost:5173/api/chat
        Body: { "message": "Hello", "model": "llama-3.3-70b-versatile", "session_id": "uuid-..." }

Step 3: Nginx proxy
        Matches location /api/ → forwards to http://backend:8000/api/chat
        (Internal Docker network — no cross-origin issue)

Step 4: FastAPI receives request
        routes/chat.py validates model name and message

Step 5: Langfuse trace starts
        langfuse_client.create_trace(session_id, message)
        langfuse_client.create_generation(trace, model, message)
        ─► Langfuse SDK queues these events in background thread

Step 6: Groq API call
        groq_client.chat.completions.create(model=..., messages=[...])
        ─► HTTPS request to api.groq.com (external internet)
        ─► Groq runs inference on Llama 3.3 70B or Mixtral
        ─► Returns completion in ~500ms–2s

Step 7: Langfuse generation ends
        langfuse_client.finish_generation(generation, response_text, model)
        langfuse_client.score_trace(trace, value=1.0)
        ─► Latency is auto-calculated as time between start and end

Step 8: FastAPI returns response
        { "response": "Hi! How can I help?", "model": "...", "session_id": "..." }

Step 9: Nginx passes response to browser
        React updates state → message bubble appears in UI

Step 10: Langfuse SDK flushes (background, ~5s later)
         HTTP POST http://langfuse-server:3000/api/public/ingestion
         ─► Trace, generation, and score appear in Langfuse dashboard
```

**Error path:** If the Groq API fails (rate limit, bad key, network), the `except` block calls `finish_generation()` with the error message and `score_trace(value=0.0)`. The error is also returned to the frontend as an HTTP 502 with a message displayed in red in the chat UI.

---

## 6. Environment Variables

Full reference for every variable in `.env`:

### `GROQ_API_KEY`

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- **What it is:** API key for the Groq inference service
- **Where to get it:** Sign up at [https://console.groq.com](https://console.groq.com) → API Keys → Create Key
- **Free tier:** Yes — generous rate limits, no credit card required
- **Used by:** `backend/routes/chat.py` via `Groq(api_key=settings.groq_api_key)`

---

### `LANGFUSE_PUBLIC_KEY`

```env
LANGFUSE_PUBLIC_KEY=pk-lf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

- **What it is:** Public identifier for a Langfuse project; safe to use client-side
- **How to generate:** Open `http://localhost:3000` → create org + project → Settings → API Keys → Create
- **Used by:** Langfuse SDK to route traces to the correct project

---

### `LANGFUSE_SECRET_KEY`

```env
LANGFUSE_SECRET_KEY=sk-lf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

- **What it is:** Secret key that authenticates SDK writes to Langfuse
- **How to generate:** Same screen as `LANGFUSE_PUBLIC_KEY` — generated together as a pair
- **Security:** Never expose in frontend code or logs; backend-only
- **Used by:** Langfuse SDK to authenticate the `/api/public/ingestion` POST calls

---

### `LANGFUSE_HOST`

```env
LANGFUSE_HOST=http://langfuse-server:3000
```

- **What it is:** URL the Langfuse SDK sends traces to
- **Why `langfuse-server:3000` and not `localhost:3000`:** The backend runs inside a Docker container. `localhost` inside that container refers to the backend container itself. `langfuse-server` is the Docker DNS hostname of the Langfuse container on the `chatbot-net` network.
- **Common mistake:** Setting this to `http://localhost:3000` causes all trace uploads to fail silently with connection errors

---

### `NEXTAUTH_SECRET`

```env
NEXTAUTH_SECRET=SHnHJJjVxsFIvqYDX-JKrdgQAMsWjUoVVU3L9bxnLvA
```

- **What it is:** Secret used by NextAuth.js (Langfuse's authentication layer) to sign and verify session JWTs
- **How to generate:**
  ```bash
  openssl rand -base64 32
  # or
  python3 -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
- **Security:** Must be a random string; if changed, all existing user sessions are invalidated

---

### `SALT`

```env
SALT=sNWCkZt_GR_1Ci3m-iL_lJQCI4V-8oR4fLrdMs0crgw
```

- **What it is:** Salt used when hashing Langfuse API keys stored in PostgreSQL
- **How to generate:** Same as `NEXTAUTH_SECRET` — use `openssl rand -base64 32`
- **Security:** If changed after API keys are created, existing keys will become invalid

---

### `POSTGRES_PASSWORD`

```env
POSTGRES_PASSWORD=securepassword123
```

- **What it is:** Password for the `postgres` superuser in the PostgreSQL container
- **Used by:** Both the `postgres` container (to set the password) and `DATABASE_URL` (to authenticate)
- **Production note:** Use a strong random password — this is the only protection for your trace data

---

### `DATABASE_URL`

```env
DATABASE_URL=postgresql://postgres:securepassword123@postgres:5432/langfuse
```

Parsed as:
```
postgresql://  postgres  :  securepassword123  @  postgres  :  5432  /  langfuse
              ──────────    ─────────────────     ────────    ─────    ────────
              username      password              hostname    port     database
```

- `postgres` (hostname) → Docker DNS name of the `postgres` service
- `langfuse` (database) → auto-created by PostgreSQL on first boot because `POSTGRES_DB=langfuse`
- **Used by:** `langfuse-server` container's Prisma ORM to run migrations and store all data

---

## 7. Common Issues & Fixes

### Issue 1: `langfuse-server` container is unhealthy

**Symptom:**
```
Container chatbot-langfuse-server-1  Error  dependency langfuse-server failed to start
dependency failed to start: container chatbot-langfuse-server-1 is unhealthy
```

**Cause:** The Langfuse Next.js server takes 10–15 seconds to start and run database migrations. If the health check fires too aggressively before the server is ready, it marks the container unhealthy.

**Fix:** Increase `start_period` and `retries` in `docker-compose.yml`:

```yaml
langfuse-server:
  healthcheck:
    test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:3000/api/public/health || exit 1"]
    interval: 10s
    timeout: 10s
    retries: 15          # was 5 → increased to 15
    start_period: 60s    # was 30s → increased to 60s
```

---

### Issue 2: `localhost` resolves to IPv6 `[::1]` inside the Langfuse container

**Symptom:** Health check fails with "Connection refused" even though Langfuse logs show `✓ Ready`.

**Cause:**
```
Connecting to localhost:3000 ([::1]:3000)   ← wget picks IPv6
wget: can't connect to remote host: Connection refused
```

The Langfuse container's `/etc/hosts` lists `::1 localhost` before `127.0.0.1 localhost`. `wget` resolves `localhost` to `[::1]` (IPv6), but Next.js only binds to IPv4 `0.0.0.0`.

**Fix 1:** Use `127.0.0.1` explicitly in the health check:
```yaml
test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:3000/api/public/health || exit 1"]
```

**Fix 2:** Force Next.js to bind on all interfaces (including localhost):
```yaml
environment:
  HOSTNAME: "0.0.0.0"
```

Both fixes are applied in the current `docker-compose.yml`.

---

### Issue 3: `httpx.InvalidURL: Invalid port: '3000  ✅'`

**Symptom:**
```
backend-1  | httpx.InvalidURL: Invalid port: '3000  ✅'
```

All Langfuse trace uploads fail. No traces appear in the dashboard.

**Cause:** The `LANGFUSE_HOST` value in `.env` has extra characters after the port number, most likely copy-pasted from a formatted document or messaging app:

```env
LANGFUSE_HOST=http://langfuse-server:3000  ✅   ← WRONG
```

**Fix:** Edit `.env` and ensure the value has no trailing spaces, emoji, or invisible characters:

```env
LANGFUSE_HOST=http://langfuse-server:3000        ← CORRECT
```

Then recreate the container (not just restart — `restart` does not reload env vars):

```bash
docker compose up -d backend
```

**Important distinction:**
- `docker compose restart backend` — restarts the process inside the existing container; **does NOT reload `.env`**
- `docker compose up -d backend` — detects changed env vars and **recreates** the container; **DOES reload `.env`**

Verify the running container has the correct value:
```bash
docker exec chatbot-backend-1 env | grep LANGFUSE_HOST
# Should output: LANGFUSE_HOST=http://langfuse-server:3000
```

---

### Issue 4: Gemini API returns quota errors / zero free tier

**Symptom:** All chat messages fail with quota exceeded errors from the Gemini API.

**Cause:** Google's Gemini API free tier has a quota of 0 requests per day in some regions (notably India).

**Fix:** Switch to Groq API, which offers genuinely free inference:
1. Sign up at [https://console.groq.com](https://console.groq.com)
2. Create an API key
3. Replace in `backend/requirements.txt`:
   ```
   google-generativeai==0.7.2  →  groq==0.9.0
   ```
4. Update `backend/routes/chat.py` to use the Groq client
5. Update models to `llama-3.3-70b-versatile` and `mixtral-8x7b-32768`
6. Rebuild: `docker compose up --build`

---

### Issue 5: Backend or frontend fail to start because Langfuse is unhealthy

**Symptom:**
```
Container chatbot-backend-1  Error  dependency backend failed to start
dependency failed to start: container chatbot-backend-1 is unhealthy
```

**Cause:** The `depends_on: condition: service_healthy` chain means any unhealthy upstream service prevents all downstream services from starting.

**Diagnosis order:**
```bash
docker compose ps                           # see which service is unhealthy
docker compose logs langfuse-server --tail=30    # check langfuse logs
docker compose logs backend --tail=30            # check backend logs
```

**Fix for Langfuse specifically:** The usual cause is insufficient `start_period`. Increase it as described in Issue 1.

**Fix for backend specifically:** If the backend is unhealthy, check:
```bash
docker exec chatbot-backend-1 env | grep -E "GROQ|LANGFUSE"
```
Ensure all variables are set without extra characters.

---

## 8. Langfuse Dashboard Guide

Access the dashboard at **http://localhost:3000** after logging in with the account you created on first run.

### Dashboard Overview

The main dashboard shows aggregated metrics for your selected time range:

| Widget | What It Shows |
|---|---|
| **Traces** | Count of complete user interactions by trace name |
| **Model Costs** | Token usage and USD cost per model (Groq is $0.00 on free tier) |
| **Scores** | Distribution of `completion-success` scores (1.0 = success, 0.0 = error) |
| **Model Usage chart** | Traces over time — useful for spotting usage spikes |
| **User Consumption** | Cost and trace count broken down by `user_id` (= session ID) |

### Traces Section

Click **Tracing → Traces** in the sidebar.

Each row is one chat message (one call to `POST /api/chat`). Columns:

| Column | Description |
|---|---|
| **Name** | Always `chatbot-conversation` (set in `langfuse_client.py`) |
| **User** | The browser session UUID |
| **Session** | Same as User in this project — groups all messages from one tab |
| **Latency** | Total time from trace start to score submission |
| **Input Tokens** | Tokens in the user's prompt (requires model to report usage) |
| **Output Tokens** | Tokens in the AI response |
| **Scores** | The `completion-success` score (1 or 0) |

Click any trace row to see the full detail view with the input prompt, output response, and nested generation span.

### Generations Section

Click **Tracing → Generations** in the sidebar.

Shows every individual LLM call with:
- **Model** — which Groq model was used
- **Input** — the exact prompt sent to the model
- **Output** — the exact response received
- **Latency** — time from generation start to `.end()` (pure LLM time, no network overhead)
- **Metadata** — `message_length`, `response_length`

### Sessions Section

Click **Tracing → Sessions** in the sidebar.

Groups all traces by `session_id`. Since session IDs are generated per browser tab (`uuidv4()` on page load), one session = one browser tab's full conversation history.

Useful for: replaying a full conversation to understand context when debugging a bad response.

### How to Debug a Bad AI Response

1. Go to **Tracing → Traces**
2. Find the trace with the bad response (sort by timestamp)
3. Click the trace → expand the `groq-completion` generation
4. Check **Input** — was the prompt correct?
5. Check **Output** — what exactly did the model return?
6. Check **Latency** — was there a timeout or slow response?
7. Check **Score** — is it `0.0`? That means an exception was caught in the backend
8. If score is `0.0`, the output field will contain the error message (e.g., `ERROR: ...`)

### How to Check Latency and Token Usage

- **Latency trends:** Dashboard → Traces chart — look for latency spikes
- **Per-model latency:** Generations → filter by Model → sort by Latency
- **Token usage:** Generations → Input Tokens / Output Tokens columns (note: Groq's free SDK response does include token counts but Langfuse needs the model to be configured to extract them from the response metadata)

---

## 9. How to Run This Project

### Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) (includes Docker Compose v2) or Docker Engine + Docker Compose plugin
- A free Groq API key from [https://console.groq.com](https://console.groq.com)

### Step-by-Step Setup

**Step 1: Enter the project directory**

```bash
cd chatbot
```

**Step 2: Create your `.env` file**

```bash
cp .env.example .env
```

**Step 3: Generate secure secrets**

```bash
# Using Python (available everywhere)
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# Run this TWICE — once for NEXTAUTH_SECRET, once for SALT
```

Or using OpenSSL:
```bash
openssl rand -base64 32   # for NEXTAUTH_SECRET
openssl rand -base64 32   # for SALT
```

**Step 4: Edit `.env` with your values**

```env
GROQ_API_KEY=gsk_your_actual_groq_key_here
NEXTAUTH_SECRET=paste_first_generated_secret_here
SALT=paste_second_generated_secret_here
POSTGRES_PASSWORD=securepassword123
DATABASE_URL=postgresql://postgres:securepassword123@postgres:5432/langfuse

# Leave these as placeholders for now — you'll fill them in Step 6
LANGFUSE_PUBLIC_KEY=pk-lf-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LANGFUSE_SECRET_KEY=sk-lf-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LANGFUSE_HOST=http://langfuse-server:3000
```

**Step 5: Start the stack (first time)**

```bash
docker compose up -d
```

Postgres and Langfuse start first. Wait ~60 seconds for Langfuse to run database migrations and become healthy:

```bash
docker compose ps   # wait until langfuse-server shows (healthy)
```

**Step 6: Create a Langfuse account and get API keys**

1. Open **http://localhost:3000**
2. Click **Sign Up** → enter any email and password (self-hosted, no verification)
3. Create an **Organization** (e.g., `chatbot-org`)
4. Create a **Project** (e.g., `chatbot`)
5. Go to **Settings → API Keys → Create new secret key**
6. Copy both `pk-lf-...` and `sk-lf-...` values

**Step 7: Update `.env` with real Langfuse keys**

```env
LANGFUSE_PUBLIC_KEY=pk-lf-your-real-key-here
LANGFUSE_SECRET_KEY=sk-lf-your-real-key-here
```

**Step 8: Recreate the backend container to load new env vars**

```bash
docker compose up -d backend
```

> **Note:** Use `up -d`, not `restart`. The `restart` command does not reload `.env` values.

**Step 9: Verify everything is running**

```bash
docker compose ps
```

Expected output:
```
NAME                        STATUS
chatbot-postgres-1          Up (healthy)
chatbot-langfuse-server-1   Up (healthy)
chatbot-backend-1           Up (healthy)
chatbot-frontend-1          Up
```

**Step 10: Test the application**

```bash
# Test backend health
curl http://localhost:8000/health
# Expected: {"status":"ok"}

# Test Langfuse health
curl http://localhost:3000/api/public/health
# Expected: {"status":"OK","version":"2.x.x"}

# Open the chatbot UI
xdg-open http://localhost:5173   # Linux
open http://localhost:5173        # macOS
```

Send a test message, then check **http://localhost:3000 → Tracing → Traces** — a `chatbot-conversation` trace should appear within ~5 seconds.

### Stopping and Restarting

```bash
# Stop all containers (data is preserved in postgres_data volume)
docker compose down

# Stop and delete all data (full reset)
docker compose down -v

# Restart after stopping (no rebuild needed)
docker compose up -d

# Rebuild after code changes
docker compose up --build -d
```

---

## 10. Why Langfuse? (Benefits)

### Debug Bad AI Responses

Without observability, when a user reports "the AI gave a weird answer," you have no way to reproduce it. With Langfuse, every response is permanently stored with its exact input prompt, output, model, and timestamp. You can click into any trace and see exactly what happened.

### Track Costs Per User and Session

Each trace records the session UUID as `user_id`. Langfuse aggregates token usage and cost per user, so you can see which sessions consumed the most tokens — critical for budgeting when you move to paid models.

### Monitor Latency Trends

The Langfuse dashboard shows latency over time for every generation. If a model provider's response time degrades, you'll see the spike immediately without needing to instrument your code separately.

### Prompt Version Management

Langfuse's **Prompts** section lets you version, A/B test, and manage system prompts centrally. Instead of hardcoding prompts in code and redeploying to change them, you can update them from the Langfuse UI and the SDK fetches the latest version at runtime.

### Evaluate Response Quality

The **Scores** feature (used in this project as `completion-success`) can be extended to:
- Human annotations from reviewers
- Automated evaluation (LLM-as-judge)
- User feedback (thumbs up/down buttons)

Scores are stored per-generation and shown in aggregate, enabling systematic quality tracking over time.

### Session-Level Conversation Analysis

The **Sessions** view groups all traces from a single browser session. This lets you replay an entire conversation in sequence, which is essential for understanding multi-turn context failures or spotting patterns in how users interact with the bot.

### Summary

| Problem | Without Langfuse | With Langfuse |
|---|---|---|
| AI gave wrong answer | No way to reproduce or investigate | Click trace, see exact prompt + response |
| Response is slow | Check server logs manually | Latency graph in dashboard |
| Cost is too high | Guess which model is expensive | Per-model token breakdown |
| Prompt needs tuning | Edit code, rebuild, redeploy | Update in Langfuse UI, instant |
| Quality is dropping | Notice through user complaints | Score trend chart shows degradation |
| User had bad session | Ask user to describe conversation | Replay full session in Sessions view |
