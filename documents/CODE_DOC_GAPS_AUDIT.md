# Decodex Code vs. Documentation Compliance Audit

**Audit Date:** August 8, 2026  
**Auditor:** Legal & Technical Compliance Review  
**Target Release:** Phase 0 Launch (India Market)  

This document details discrepancies identified between **actual backend code implementation** (`backend/src/`) and **legacy internal documentation** (`documents/SECURITY_ANALYSIS.md`, `README.md`).

---

## Identified Discrepancies & Audit Matrix

| Area | Former Internal Claim (`SECURITY_ANALYSIS.md`) | Actual Code Behavior (`backend/src/`) | Compliance / Legal Risk | Action Taken / Recommendation |
|------|-----------------------------------------------|----------------------------------------|-------------------------|--------------------------------|
| **Audio Retention** | *"Raw audio: 0 (never stored). Immediate deletion after STT in-memory."* (§5.1) | `reading_sessions.audio_base64` persists base64 audio string permanently in PostgreSQL (`routes/sessions.ts` L91–93). | 🔴 **High Risk** — Overstating privacy in docs while retaining voice recordings violates DPDP Act §9 consent requirements. | **Documented in Privacy Policy §6:** Plainly disclosed permanent audio storage. Recommend evaluating post-STT audio deletion for Phase 1. |
| **Cross-Border Transfer** | Assumed local in-country processing. | Backend hosted on Render (US Oregon), DB on Supabase/AWS (US), AI via OpenAI/Groq (US). | 🟡 **Medium Risk** — DPDP Act §16 permits US transfer currently, but requires explicit parental notice. | **Documented in Privacy Policy §7:** Added explicit cross-border disclosure for USA hosting. |
| **Verification Method** | *"Knowledge-based verification with parent DOB + parent email link."* | `routes/consent.ts` accepts DOB-only or invite code without multi-factor identity proofing. | 🟡 **Medium Risk** — DPDP Act 2025 Rules require "verifiable" consent. | **Flagged:** Recommend adding OTP verification via email/SMS before production scaling. |
| **IEP / Special Ed Records** | Unmentioned in security threat matrix. | `migration_v2.sql` & `copilot.ts` store sensitive IEP strategies, risk levels, and teacher feedback. | 🟡 **Medium Risk** — Special education records are sensitive student data under educational privacy norms. | **Documented in Privacy Policy §4.2:** Added explicit section for IEP & Special Ed data processing. |
| **Consent Expiry** | Claimed infinite until manual withdrawal. | `middleware/consent.ts` (L22) enforces 365-day expiration (`consent_date >= NOW() - 365 days`). | 🟢 **Positive Gap** — Code is stricter than old docs; complies with annual re-consent best practices. | **Documented in Policy §8:** Accurately reflected 365-day consent lifecycle. |
| **Subprocessors** | Referred to generic "LLM provider". | Expressly relies on OpenAI, Groq, Gmail SMTP, Render, and Supabase. | 🟢 **Resolved** — All subprocessors explicitly named in Privacy Policy §7. | **Documented in Policy §7.** |
