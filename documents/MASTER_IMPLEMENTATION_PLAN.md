# Decodex Master Implementation Plan

This document serves as the single source of truth for the Decodex hackathon implementation process. It outlines the execution strategy for all 8 Sprint Blocks.

> [!IMPORTANT]
> **Change Management Protocol**: If any architectural changes, new dependencies, or ticket reprioritizations occur during development, this document **MUST be updated first** before any code is written to reflect the change.

## Architecture & Infrastructure Overview
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, React Router.
- **Backend**: Node.js, Express, TypeScript.
- **Database**: PostgreSQL 15 (relational data, JSONB for alignments/drills).
- **Queue & Cache**: Bull + Redis 7 (async pipeline & LLM caching).
- **AI Services**: OpenAI Whisper (STT) and GPT-4o (Classification).

---

## 🟢 Sprint Block 1: Scaffold & Infra (COMPLETED)
**Focus**: Project scaffold, Docker infrastructure, and foundational setup.
- **Database**: `docker-compose.yml` for Postgres and Redis.
- **Backend**: Express + TypeScript server (`/backend`). Security middleware (Helmet, CORS). Database schema (`schema.sql`).
- **Frontend**: Vite + React + TypeScript + Tailwind CSS (`/frontend`). Proxy configured to bypass CORS.

## 🟢 Sprint Block 2: Auth + Passages + Audio Foundations (COMPLETED)
**Focus**: User authentication, role-based access, and recording UI.
- **Backend Auth**: `bcrypt` password hashing, JWTs stored in `httpOnly` secure cookies. Auth and RBAC middleware.
- **Backend Passages**: Seed data (`seed.sql`) and API routes for fetching passages.
- **Frontend Auth**: `AuthContext` global state, API client wrapper `useApiQuery` for cookie inclusion.
- **Frontend UIs**: Login, Register, role-aware Dashboard, Passage Selection grid, and the `AudioRecorder` component (Click-to-Toggle Web Speech API).

---

## 🟡 Sprint Block 3: Core Pipeline (STT + Alignment + Queue) (UP NEXT)
**Focus**: The asynchronous processing pipeline and Speech-to-Text integration.
1. **Bull Queue Setup**: Configure Bull queue backed by Redis in the backend.
2. **Audio Upload API**: `POST /api/v1/sessions/:id/audio` accepts audio blobs, saves them to disk/memory, enqueues a `process-session` job, and returns 202 Accepted.
3. **SSE Endpoint**: `GET /api/v1/sessions/:id/status/stream` to push real-time pipeline status updates to the frontend.
4. **Whisper Integration**: Call OpenAI Whisper API inside the job worker to get the transcript.
5. **Alignment Engine**: Compare the transcript against the passage text to generate the diff (omissions, insertions, substitutions).
6. **Frontend Integration**: Hook up `AudioRecorder` to the upload API and listen to the SSE stream for status updates.

## ⚪ Sprint Block 4: Classification + Drills + Cache
**Focus**: LLM analysis, prompt engineering, and caching.
1. **LLM Integration**: Pass the alignment diff to GPT-4o with the strict O-G taxonomy prompt to classify errors.
2. **Redis Caching**: Hash the alignment diff. Check Redis before calling the LLM. Cache LLM responses to reduce latency and API costs.
3. **Drill Generation**: Use the classification results to generate targeted drills (e.g., phoneme isolation) and save to the `drills` table.
4. **Error Profiles**: Aggregate the classifications into the student's `error_profiles` table to track metrics like WPM and error rate.
5. **Circuit Breaker**: Implement `opossum` around OpenAI calls to prevent cascading failures on timeouts.

## ⚪ Sprint Block 5: Results UI + Dashboard
**Focus**: Visualizing the diagnostic results for the student.
1. **Results Page**: Build the detailed results view (`/sessions/:id/results`) showing WPM, error rate, and the annotated passage with color-coded errors.
2. **Drills UI**: Build the interactive UI for students to complete the generated drills.
3. **Student Dashboard**: Expand the student home page to show historical trend charts (using `recharts`) and recent sessions.

## ⚪ Sprint Block 6: Teacher Dashboard + Feedback
**Focus**: The educator experience and the AI feedback loop.
1. **Teacher Views**: Build `/teacher/students` to see aggregate class data, and `/teacher/students/:id` for individual student trend charts.
2. **Classification Feedback UI**: In the detailed session view, add a "Wrong Classification?" button for teachers to override the LLM.
3. **Corrections API**: `POST /api/v1/sessions/:id/classifications/:errorId/feedback` to store corrections in `classification_corrections` for future prompt tuning.

## ⚪ Sprint Block 7: Pipeline Integration & Polish
**Focus**: Tying everything together securely and robustly.
1. **End-to-End Testing**: Ensure the flow from recording -> pipeline -> results -> drills works seamlessly.
2. **Error Handling**: Ensure the frontend degrades gracefully if the LLM classification fails (showing alignment diff only).
3. **Responsive Design**: Final Tailwind sweeps for tablet/mobile responsiveness (teachers often use tablets).
4. **Parent Consent Gateway**: Implement the COPPA consent check preventing audio recording if `consent_granted = false`.

## ⚪ Sprint Block 8: Demo Prep & Deploy
**Focus**: Getting ready for the hackathon judges.
1. **Seed Data Expansion**: Ensure we have robust demo data (fake students, history, error trends).
2. **Deployment**: Dockerize the backend (`Dockerfile`) and deploy Postgres/Redis/API to Render. Deploy frontend to Vercel.
3. **Demo Script**: Rehearse the 3-minute pitch (Problem -> Live Demo -> Teacher Feedback -> Tech Stack).
