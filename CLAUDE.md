# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Decodex** is an AI-powered diagnostic reading platform for dyslexia education. It captures student reading aloud, transcribes via Whisper, aligns against source text with Needleman-Wunsch DP, classifies errors using Orton-Gillingham taxonomy (GPT-4o-mini), generates personalized practice drills, and provides teachers and parents with actionable analytics with human-in-the-loop override capability.

### Architecture

```
Client (React 19 + Vite) ↔ Express 5 API (Render) ↔ PostgreSQL (Supabase) + Redis (Queue + Cache)
                                    ↓
                            Bull Worker (Async Pipeline)
                                    ↓
                            OpenAI Whisper (STT) + GPT-4o-mini (Classification)
```

**Audio processing flow:** Student records → audio uploaded to Express → job enqueued in Redis/Bull → worker transcribes (Whisper) → aligns transcript to source (Needleman-Wunsch) → classifies errors (GPT-4o-mini with O-G taxonomy prompt) → saves results → generates drills → pushes status via SSE to frontend.

---

## Common Development Commands

### Root Workspace
```bash
npm run install:all       # Install all dependencies (skills + backend + frontend)
npm run skills:install    # Install skill dependencies
```

### Backend
```bash
cd backend
npm run dev               # Start dev server with ts-node-dev (http://localhost:3000)
npm run build             # TypeScript compile + copy DB files
npm start                 # Run production build
npm run start:prod        # Seed prod data + run production build
npm test                  # Run tests with vitest
npm run test:coverage     # Run tests with coverage
```

### Frontend
```bash
cd frontend
npm run dev               # Start Vite dev server (http://localhost:5173, proxies /api to backend)
npm run build             # TypeScript compile + Vite build
npm run lint              # Run oxlint
npm run preview           # Preview production build
npm test                  # Run tests with vitest
npm run test:coverage     # Run tests with coverage
```

### Single Test Run
```bash
# Backend
cd backend && npx vitest run src/__tests__/specific-file.test.ts

# Frontend
cd frontend && npx vitest run src/__tests__/specific-file.test.tsx
```

### Infrastructure
```bash
docker compose up -d      # Start PostgreSQL (port 5433) and Redis (port 6379)
docker compose down       # Stop infrastructure
```

---

## Key Technical Decisions

### Circuit Breaker Pattern (Opossum)
All OpenAI API calls (Whisper and GPT-4o-mini) are wrapped in Opossum circuit breakers. When the provider is down or rate-limited, the circuit opens and the system falls back to a deterministic Orton-Gillingham rule engine. Errors classified during fallback are tagged as `UNC` (Uncertain) for teacher review.

### Consent-Gating Architecture
Parental consent is required before any audio recording. Uses invite codes for parent-student linking, knowledge-based verification (DOB) with rate-limited attempts, consent withdrawal with 30-day hard-delete grace period, and data erasure jobs. The `requireConsent` middleware blocks audio upload until valid consent exists.

### Role-Based + Relationship-Verified Authorization
- **Students**: Only own sessions, drills, results (IDOR guards)
- **Teachers**: Only students at same school (`school_id` join)
- **Parents**: Only children linked via `parent_student_links`
- **Admins**: Bypass relationship checks

### Mascot States & Celebrations
The student companion avatar (`DexAvatar.tsx`) dynamically renders state-based visuals (idle, speaking, listening, thinking, celebrating, concerned) with smooth CSS transforms and border highlights. Transitioning into the `'celebrating'` state automatically triggers a lightweight, canvas-based particle burst (`ConfettiBurst.tsx`) for 1.8 seconds. This requires no external libraries and handles canvas resizing, canvas clear, and requestAnimationFrame garbage collection cleanly.

---

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── routes/         # Express route handlers (auth, dex, passages, sessions, etc.)
│   │   ├── middleware/     # Auth, RBAC, consent, upload
│   │   ├── services/       # Business logic (alignment, classification, drills, TTS)
│   │   ├── queue/          # Bull worker for async audio pipeline
│   │   ├── db/             # Schema, migrations, seed data
│   │   └── __tests__/      # Backend test suite (vitest)
│   ├── vitest.config.ts
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── pages/          # Route page components
│   │   ├── components/     # Shared UI components (ConfettiBurst, DexAvatar, AnnotatedText, etc.)
│   │   ├── hooks/          # Custom hooks (useDex, useSessionSSE)
│   │   ├── lib/            # API client, constants
│   │   ├── context/        # AuthContext provider
│   │   └── __tests__/      # Frontend test suite (vitest + testing-library)
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tsconfig.app.json / tsconfig.node.json
├── documents/              # PRD, TRD, specs, feature tickets
├── .github/workflows/      # CI pipeline
├── docker-compose.yml      # Local dev infrastructure
└── .agents/skills/         # Project-specific skills
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** | Random string ≥32 chars (`openssl rand -base64 32`) |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `REDIS_URL` | **Yes** | Redis connection string |
| `OPENAI_API_KEY` | Yes* | OpenAI API key for Whisper + GPT-4o-mini |
| `GROQ_API_KEY` | Yes* | Alternative free-tier API key (Groq) |
| `FRONTEND_URL` | No | Frontend origin for CORS (default: `http://localhost:5173`) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | No | For consent email delivery |

*At least one of `OPENAI_API_KEY` or `GROQ_API_KEY` required.

---

## Testing

- **Backend**: vitest with Node environment, globals enabled, setup file at `src/__tests__/helpers/setup.ts`
- **Frontend**: vitest with jsdom environment, globals enabled, setup file at `src/__tests__/setup.ts`
- **Coverage**: v8 provider, text + lcov reporters
- **Test patterns**: `src/__tests__/**/*.test.ts` (backend), `src/__tests__/**/*.test.{ts,tsx}` (frontend)

---

## Security Practices

- Parameterized SQL queries throughout
- bcrypt password hashing (cost factor 12)
- httpOnly, secure, sameSite cookie auth (no localStorage tokens)
- Rate limiting: auth endpoints 10 req/15 min, global 60 req/15 min
- Relationship-verified data access on all endpoints
- Consent gating on audio upload
- Error message masking in production
- CORS allowlist (production frontend + preview deployments)

---

## Key Files to Understand

### Backend Core
- `src/server.ts` — Express app setup, middleware, route mounting
- `src/middleware/auth.ts` — JWT verification, role extraction
- `src/middleware/rbac.ts` — Role-based access control
- `src/middleware/consent.ts` — Consent verification middleware
- `src/db/init.ts` — Database schema and initialization
- `src/queue/worker.ts` — Bull worker for audio processing pipeline
- `src/services/alignment.ts` — Needleman-Wunsch alignment implementation
- `src/services/classifier.ts` — GPT-4o-mini error classification with O-G taxonomy
- `src/services/dexTutor.ts` — Drill generation logic

### Frontend Core
- `src/main.tsx` — App entry point, providers
- `src/App.tsx` — Router setup, route definitions
- `src/context/AuthContext.tsx` — Authentication state management
- `src/hooks/useDex.ts` — Speech recognition, recording, SSE handling
- `src/hooks/useSessionSSE.ts` — Server-sent events for real-time status
- `src/lib/api.ts` — API client with interceptors
- `src/components/DexAvatar.tsx` — Student avatar companion and animation container
- `src/components/ConfettiBurst.tsx` — Lightweight canvas confetti celebration controller
- `src/pages/SessionActive.tsx` — Active recording session UI
- `src/pages/PracticePage.tsx` — Drill practice interface

---

## CI/CD

GitHub Actions workflow at `.github/workflows/ci.yml` runs:
1. Backend tests with coverage
2. Frontend tests with coverage
3. Linting (oxlint for frontend)
4. Type checking (tsc for both)

---

## Deployed URLs

- **Frontend**: https://decodex-five.vercel.app/
- **Backend Health**: https://decodex-backend.onrender.com/health
- **Test Accounts**: `student@decodex.com` / `teacher@decodex.com` / `parent@decodex.com` — password `password123`

---

## Local Development Notes

1. Run `docker compose up -d` first for PostgreSQL and Redis
2. Backend runs on port 3000, Frontend on port 5173 (proxies `/api` to backend)
3. Copy `backend/.env.example` to `backend/.env` and configure required variables
4. Database runs on port 5433 (not default 5432) to avoid conflicts