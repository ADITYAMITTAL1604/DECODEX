# Decodex — AI Reading Diagnostic Companion 📖✨

![Decodex Banner](https://via.placeholder.com/1200x400/4f46e5/ffffff?text=Decodex+AI+Reading+Companion)

**Decodex** is a production-ready, AI-powered diagnostic reading platform designed to move beyond traditional "assistive" EdTech (like text-to-speech) into true **diagnostic pedagogy**.

## 🏆 The Problem & Solution
Currently, EdTech apps help students with dyslexia read text, but they don't tell teachers *why* a student is struggling. Without costly, time-consuming formal assessments, teachers can't easily see error patterns (e.g., visual reversals vs. phoneme blending breakdowns).

**Decodex** solves this by:
1. Having the student read aloud into the browser.
2. Aligning their speech against the source text to detect insertions, omissions, and substitutions.
3. Using GPT-4o with strict **Orton-Gillingham (O-G) prompting** to classify the exact reason for the error.
4. Auto-generating personalized reading drills based on the student's unique error profile.

## ✨ Features
- **Real-Time Asynchronous AI Pipeline**: Audio uploads are pushed to a Redis/Bull queue. The frontend listens to real-time Server-Sent Events (SSE) as the worker transcribes, aligns, classifies, and saves the data.
- **Circuit Breaker Resilience**: Built with `opossum`, external OpenAI API calls (Whisper STT and GPT-4o) are wrapped in circuit breakers. If the AI goes down, the system gracefully falls back to mock data or 'Uncertain' classifications, ensuring the app never crashes in the classroom.
- **LLM Caching**: Identical reading errors are cached in Redis, dropping AI classification latency from ~2000ms to ~5ms and saving API costs.
- **Teacher "Human-in-the-Loop" Dashboard**: Teachers can view student charts (WPM and Error Rates via `recharts`) and **override** the AI's classifications. These corrections are saved non-destructively, preserving data to fine-tune future LLM prompts.

## 🏗️ Architecture Stack
- **Frontend**: React, Vite, TailwindCSS, React Router, Recharts, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Bull (Redis queue), Opossum (Circuit breakers).
- **Database**: PostgreSQL (relational analytics & profiles), Redis (Caching & Job Queue).
- **AI**: OpenAI Whisper (STT) and GPT-4o-mini (Classification).
- **Deployment**: Dockerized multi-stage builds served by Nginx.

## ⚡ Development Mode (One Command)

> **Fastest way to run the full stack locally.** Requires Python 3.8+ and Node.js. Postgres and Redis must be running (locally or via Docker).

```bash
python app.py
```

This single command will:
1. Copy `backend/.env.example` → `backend/.env` if missing (and warn about placeholder secrets).
2. Check that Postgres & Redis are reachable (warns if not, continues anyway).
3. Run `npm install` in backend/ and frontend/ if `node_modules/` is missing.
4. Launch both dev servers with colour-prefixed streaming output.
5. Poll the backend health endpoint, then print URLs and a link to demo credentials.

Press **Ctrl+C** to stop the dev servers.

> The manual setup steps below still work if you prefer running services individually.

---

## 🚀 How to Run (Judges)

### 1. Prerequisites
- Docker & Docker Compose
- An OpenAI API Key (Required for full classification, though the app has a built-in mock fallback if missing).

### 2. Quickstart (Production Mode)
```bash
# Clone the repo
git clone <repository-url>
cd decodex

# Export your OpenAI key
export OPENAI_API_KEY="sk-your-real-key"

# Build and start the production containers
docker compose -f docker-compose.prod.yml up --build -d
```

### 3. Access the App
- **Frontend App**: [http://localhost](http://localhost) (Served by Nginx)
- **Backend API**: `http://localhost:3000/api/v1`

### 4. Test Accounts
The database automatically seeds with the following test accounts:
- **Student Account**: `student@decodex.com` / `password123`
- **Teacher Account**: `teacher@decodex.com` / `password123`

---
*Built with ❤️ for the Hackathon.*
