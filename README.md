# Decodex — AI Reading Diagnostic & Dyslexia Clinic Companion 📖✨

---

## 🏆 The Problem & Solution

EdTech tools help students read text aloud (Text-to-Speech), but they fail to explain **why** a student is struggling. Without costly, multi-month formal clinical assessments, educators and parents cannot detect actionable error patterns (such as visual letter/word reversals versus phoneme blending breakdowns).

**Decodex** solves this by creating an end-to-end diagnostic and remediation loop:
1. **Student Speech Capture**: The student reads a diagnostic passage aloud in the browser with real-time Web Audio API voice clarity metering.
2. **Needleman-Wunsch DP Speech Alignment**: Aligns Whisper speech transcripts against the source passage using Needleman-Wunsch matrix sequence alignment to eliminate false omissions caused by hesitations.
3. **Orton-Gillingham (O-G) Taxonomy Classification**: Uses **GPT-4o** / **GPT-4o-mini** with strict Orton-Gillingham prompts to categorize error root causes (`REV` Reversals, `SUB` Substitutions, `BLD` Blend breakdowns, `OMI` Omissions, `INS` Insertions).
4. **Interactive Sight Word Practice Clinic**: Auto-generates personalized sight word drills with letter-by-letter spelling, phonics sound breakdowns, TTS audio, and real-time Speech-to-Text pronunciation verification.
5. **Teacher & Parent Portal**: Human-in-the-loop overrides, WPM and accuracy analytics, and in-app parent-student consent authorization.

---

## ✨ Key Features

- **Needleman-Wunsch Sequence Alignment**: Dynamic programming alignment matrix (`MATCH=0`, `SUB=0.8`, `GAP=1.0`) prevents false omissions when students pause or self-correct.
- **Interactive Practice Clinic Page (`/sessions/:id/practice`)**: Full-screen dedicated practice page matching Decodex light mode theme (`#006474` primary teal, glassmorphism cards).
- **Real-Time Speech Pronunciation Verification**: Uses live Speech-to-Text to evaluate student pronunciation in real time with strict word token verification, 6-second auto-reset safety timeouts, and TTS audio cancellation.
- **Voice-Synced Mic Intensity & Clarity Meter**: Web Audio API frequency visualizer syncing microphone animation with voice volume.
- **Parent Consent In-App Notification System**: Webpage invite code authorization eliminating email dependency.
- **Resilient AI Pipeline**: Opossum circuit breakers fallback gracefully to an Orton-Gillingham rule engine if offline or rate-limited.
- **Redis Caching Layer**: Caches repeat error classifications, reducing LLM latency from ~2000ms to ~5ms.

---

## 🏗️ Architecture Stack

- **AI Infrastructure**: Codex, OpenAI Whisper, OpenAI GPT-4o / GPT-4o-mini (with Groq API support).
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS 4, React Router 7, Recharts, Lucide Icons.
- **Backend**: Node.js, Express 5, TypeScript, Bull (Redis Queue), Opossum (Circuit Breaker).
- **Database & Cache**: PostgreSQL (Analytics, Sessions, Classifications), Redis (Queue & LLM Cache).
- **Orchestrator**: Single-command Python runner (`app.py`).

---

## ⚡ Quickstart — Run the Complete Project (One Command)

> Requires Python 3.8+, Node.js, PostgreSQL (port `5433` or `5432`), and Redis (port `6379`).

```bash
python app.py
```

`app.py` automatically:
1. Verifies `backend/.env` environment configuration (`GROQ_API_KEY` / `OPENAI_API_KEY`).
2. Checks PostgreSQL and Redis infrastructure connectivity.
3. Installs missing npm dependencies for `backend/` and `frontend/`.
4. Starts the Express API Server + Bull AI Background Worker (`http://localhost:3000`).
5. Starts the Vite React Frontend App (`http://localhost:5173`).

---

## 🚀 Hackathon Judge Evaluation Credentials

Access **`http://localhost:5173`** after running `python app.py`:

| Role | Email | Password | Access / Flow |
|------|-------|----------|---------------|
| **Student** | `student@decodex.com` | `password123` | Passage selection, audio recording, interactive practice clinic |
| **Teacher** | `teacher@decodex.com` | `password123` | Classroom analytics, student diagnostic view, error overrides |
| **Parent** | `parent@decodex.com` | `password123` | In-app parent consent & invite code authorization |

---
