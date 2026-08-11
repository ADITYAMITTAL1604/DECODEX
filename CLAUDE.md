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

**Audio processing flow:** Student records → audio uploaded to Express → job enqueued in Redis/Bull → worker transcribes (Whisper) → aligns transcript to source (Needleman-Wunsch) → classifies errors (GPT-4o-mini with O-G taxonomy prompt) → saves results → generates drills → computes Health Score → updates Gamification → pushes status via SSE to frontend.

---

## Major Feature Areas (V2 AI Intervention Platform + Dex Voice-First Tutor)

### 1. Reading Health Score Engine (`healthScore.ts`)
Composite 0–100 score from 6 dimensions: WPM (grade-normalized), Accuracy, Fluency, Error Frequency, Error Severity (weighted by O-G category), Improvement Trend. Risk levels: Critical (<40), High (40–59), Medium (60–74), Good (75–89), Excellent (≥90). Persisted to `health_scores` table.

### 2. Gamification System (`gamification.ts`)
XP system with 10 levels, daily streaks with freeze mechanism (2 missed days/month), achievements (sessions, streaks, drills, stories, health score thresholds). Tables: `gamification_profiles`, `achievements`, `student_achievements`. XP awards: session=25, drill=15, story=20, perfect accuracy=50, streak/day=10.

### 3. AI Copilot (`copilot.ts` + `services/copilot.ts`)
Generates comprehensive intervention strategies for teachers using student's error profile, health score history, and learning context. Teacher-only endpoint with school-scoped access verification.

### 4. AI Story Generator (`stories.ts` + `services/storyGenerator.ts`)
Creates personalized decodable stories targeting student's specific phonetic weaknesses. Stories split into 3–4 word chunks for dyslexia-friendly reading.

### 5. Adaptive Learning Paths (`learningPaths.ts` + `services/learningPath.ts`)
4-week, 20-day Orton-Gillingham intervention roadmaps generated from reading assessment context. Stage-based progression with risk-level tracking. Includes interactive multimodal exercises (choice + voice).

### 6. Dyslexia Risk Screening (`riskScreening.ts` + `services/riskScreening.ts`)
Preliminary screening based on error patterns across sessions. Identifies indicators (e.g., high reversal frequency, blend breakdowns) with confidence score and evidence. Educational disclaimer included.

### 7. Classroom Analytics (`classroomAnalytics.ts`)
Teacher dashboard with error heatmap (O-G categories per student), class-wide weakness analysis, skill distribution (Excellent/Good/Medium/High/Critical counts).

### 8. Parent Dashboard (`parentDashboard.ts`)
Child progress cards (health score, strengths, recommendations), risk screening report, recent sessions with drill-down, consent management (link via invite code, request email with DOB KBV, withdraw with 30-day hard-delete).

### 9. Dex Voice-First Tutor (`dex.ts` + `services/dexTutor.ts` + `services/tts.ts`)
- **POST /dex/grade-answer**: Grades spoken answer against expected answer using GPT-4o-mini (multilingual)
- **POST /dex/transcribe**: Real-time STT via Whisper with consent gating
- **TTS Service**: ElevenLabs (primary) → browser SpeechSynthesis fallback. Multilingual support.

### 10. Reading Preferences & Fair Evaluation
User-configurable font scale, letter spacing, line spacing, theme. StoryReader evaluates 3–4 word chunks with ≥75% word match threshold; marks "struggled" not "mastered" on repeated failure.

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
All OpenAI API calls (Whisper and GPT-4o-mini) wrapped in Opossum circuit breakers. On provider failure, falls back to deterministic Orton-Gillingham rule engine. Errors classified during fallback tagged as `UNC` (Uncertain) for teacher review.

### Consent-Gating Architecture (Hardened V2)
Parental consent required before any audio recording. Uses invite codes for parent-student linking, knowledge-based verification (DOB) with rate-limited attempts, consent withdrawal with 30-day hard-delete grace period, data erasure jobs. `requireConsent` middleware blocks audio upload until valid consent exists. Removed insecure `/consent/approve` bypass endpoint.

### Role-Based + Relationship-Verified Authorization
- **Students**: Only own sessions, drills, results (IDOR guards)
- **Teachers**: Only students at same school (`school_id` join)
- **Parents**: Only children linked via `parent_student_links`
- **Admins**: Bypass relationship checks

### Database Migrations (Idempotent)
Schema applied via `initDB()` on startup with 9 migrations:
- V1: Core schema (users, sessions, passages, classifications, drills, error_profiles, parent_student_links, consent_requests)
- V2: Health Scores, Risk Screenings, Learning Paths, Copilot, Gamification, IEPs, Stories
- V3: Multi-Language Support (`preferred_language` on users)
- V4: Streak Freeze Mechanism (`freeze_count`, `freeze_month`)
- V5: Audio Object Storage (`audio_storage` table)
- V6: Drop deprecated `audio_base64` and `audio_file_path` columns
- V7: Harden DOB Knowledge-Based Verification (`dob_attempts`, `dob_locked_until`)
- V8: Dead-letter table for failed audio processing jobs (`audio_jobs_dead_letter`)
- V9: User Reading Preferences (`font_scale`, `letter_spacing`, `line_spacing`, `theme`)

### Mascot States & Celebrations
Student companion avatar (`DexAvatar.tsx`) renders state-based visuals (idle, speaking, listening, thinking, celebrating, concerned) with smooth CSS transforms and border highlights. Transitioning into `'celebrating'` triggers canvas-based particle burst (`ConfettiBurst.tsx`) for 1.8s. No external libraries.

### Sentry Error Tracking
`@sentry/node` initialized in `server.ts` when `SENTRY_DSN` set. Captures exceptions in worker with session context.

---

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── routes/              # Express route handlers (auth, dex, passages, sessions, teacher, consent, students, healthScore, copilot, learningPaths, stories, gamification, riskScreening, classroomAnalytics, parentDashboard, tts)
│   │   ├── middleware/          # Auth, RBAC, consent, upload
│   │   ├── services/            # Business logic (alignment, classifier, drills, TTS, healthScore, gamification, copilot, storyGenerator, passageGenerator, learningPath, riskScreening, dexTutor, openai, cache, audioStorage, email, classroomAnalytics)
│   │   ├── queue/               # Bull worker (worker.ts, index.ts, consentErasure.ts)
│   │   ├── db/                  # Schema, migrations (init.ts, schema.sql, migration_v2-v9.sql), analytics, index.ts
│   │   ├── lib/                 # logger.ts
│   │   ├── scripts/             # seed-prod.ts, reset-database.ts, backfill-audio-base64.ts
│   │   └── __tests__/           # Backend test suite (vitest) — auth, alignment-reversals, classification-corrections, consent-security, consent-kbv-hardening, copilot-parent-language, dex-transcribe-language, dex-grading, gamification-streak-freeze, parent-dashboard, queue-dead-letter, rate-limiting, reading-preferences, sessions-idor, tts, worker-stt-language
│   ├── vitest.config.ts
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── pages/               # Route page components (LandingPage, Login, Register, Dashboard, PassageSelection, SessionActive, SessionResults, PracticePage, TeacherDashboard, StudentDetail, ParentHome, ParentSessionReport, ConsentConfirm, PrivacyPolicy, TermsOfService, LearningPathPage, StoryReaderPage, CopilotPanel)
│   │   ├── components/          # Shared UI (DexAvatar, ConfettiBurst, AnnotatedText, AudioRecorder, DrillCard, DexVoiceCommands, DexNavigationGuide, ReadingPreferencesPanel, ProtectedRoute)
│   │   ├── hooks/               # Custom hooks (useDex, useSessionSSE, useApiQuery, useReadingPreferences)
│   │   ├── lib/                 # API client (api.ts), constants
│   │   ├── context/             # AuthContext, ThemeContext
│   │   └── __tests__/           # Frontend test suite (vitest + testing-library)
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.app.json / tsconfig.node.json
├── documents/                   # PRD, TRD, specs, feature tickets
├── .github/workflows/           # CI pipeline
├── docker-compose.yml           # Local dev infrastructure
└── .agents/skills/              # Project-specific skills
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
| `SENTRY_DSN` | No | Sentry error tracking DSN |
| `ELEVENLABS_API_KEY` | No | ElevenLabs TTS (primary voice provider) |

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
- Rate limiting: auth endpoints 50 req/15 min, global 300 req/15 min
- Relationship-verified data access on all endpoints
- Consent gating on audio upload (hardened with DOB KBV)
- Error message masking in production
- CORS allowlist (production frontend + preview deployments + localhost)
- Dead-letter queue for failed audio jobs with retry metadata
- Audio files never persisted — temp files deleted after STT

---

## Key Files to Understand

### Backend Core
- `src/server.ts` — Express app setup, middleware, route mounting (V1 + V2 + Dex routes)
- `src/middleware/auth.ts` — JWT verification, role extraction
- `src/middleware/rbac.ts` — Role-based access control
- `src/middleware/consent.ts` — Consent verification middleware
- `src/db/init.ts` — Database schema and migrations (V1–V9)
- `src/queue/worker.ts` — Bull worker for audio processing pipeline (Health Score + Gamification integrated)
- `src/services/alignment.ts` — Needleman-Wunsch alignment implementation
- `src/services/classifier.ts` — GPT-4o-mini error classification with O-G taxonomy
- `src/services/dexTutor.ts` — Drill generation + voice-first tutor grading
- `src/services/healthScore.ts` — Reading Health Score engine
- `src/services/gamification.ts` — XP, streaks, achievements, freeze
- `src/services/copilot.ts` — AI intervention strategy generation
- `src/services/storyGenerator.ts` — AI adaptive story generation
- `src/services/learningPath.ts` — Adaptive learning path generation
- `src/services/riskScreening.ts` — Dyslexia risk screening
- `src/services/tts.ts` — ElevenLabs + browser TTS fallback
- `src/services/classroomAnalytics.ts` — Teacher dashboard analytics
- `src/lib/logger.ts` — Structured logging (Pino)

### Frontend Core
- `src/main.tsx` — App entry point, providers
- `src/App.tsx` — Router setup, route definitions (student/teacher/parent routes)
- `src/context/AuthContext.tsx` — Authentication state management
- `src/context/ThemeContext.tsx` — Theme/dark mode management
- `src/hooks/useDex.ts` — Speech recognition, recording, TTS, SSE handling
- `src/hooks/useSessionSSE.ts` — Server-sent events for real-time pipeline status
- `src/hooks/useApiQuery.ts` — React Query-style data fetching
- `src/hooks/useReadingPreferences.ts` — Dyslexia-friendly reading preferences
- `src/lib/api.ts` — API client with interceptors
- `src/components/DexAvatar.tsx` — Student avatar companion and animation container
- `src/components/ConfettiBurst.tsx` — Lightweight canvas confetti celebration controller
- `src/components/ReadingPreferencesPanel.tsx` — Font/spacing/theme controls
- `src/components/DexVoiceCommands.tsx` — Global voice command listener
- `src/components/DexNavigationGuide.tsx` — Onboarding guide for Dex
- `src/pages/SessionActive.tsx` — Active recording session UI
- `src/pages/PracticePage.tsx` — Drill practice interface
- `src/pages/LearningPathPage.tsx` — Adaptive learning path with interactive exercises
- `src/pages/StoryReaderPage.tsx` — Narrated story reader with 3–4 word chunk evaluation
- `src/pages/CopilotPanel.tsx` — Teacher intervention strategy view
- `src/pages/TeacherDashboard.tsx` — Classroom analytics (heatmap, weaknesses, skill dist)
- `src/pages/ParentHome.tsx` — Parent portal with risk screening & consent management

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
- **Test Accounts**: `student@decodex.com` / `teacher@decodex.com` / `parent@decodex.com` / `admin@decodex.com` — password `password123`

---

## Local Development Notes

1. Run `docker compose up -d` first for PostgreSQL and Redis
2. Backend runs on port 3000, Frontend on port 5173 (proxies `/api` to backend)
3. Copy `backend/.env.example` to `backend/.env` and configure required variables
4. Database runs on port 5433 (not default 5432) to avoid conflicts
5. For ElevenLabs TTS, add `ELEVENLABS_API_KEY` to backend `.env`
6. For Sentry, add `SENTRY_DSN` to backend `.env`

---

## Error Categories (O-G Taxonomy)

| Code | Meaning |
|------|---------|
| REV | Reversal |
| SUB | Substitution |
| OMI | Omission |
| INS | Insertion |
| BLD | Blend breakdown |
| PAC | Pacing / self-correction |
| UNC | Uncertain |

Full definitions: see `decodex-domain` skill.