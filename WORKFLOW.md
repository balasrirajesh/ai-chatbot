# Production Architecture & Workflow Specification

## AI-Powered Resume–Job Description Matching Telegram Bot

This document details the complete, end-to-end execution flow of the system, including the core intelligence engines and production-control safety layers.

---

## 🏗️ Complete System Architecture Diagram

```text
                                  📱 TELEGRAM (Mobile User)
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │ Telegram Gateway│ (Telegraf)
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │ Input Validator │ (Length, format, corrupt check)
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │ Session Service │ (In-Memory + MongoDB sync)
                                    └────────┬────────┘
                                             │
                        ┌────────────────────┴────────────────────┐
                        ▼                                         ▼
                 📝 JD INPUT                               📄 RESUME INPUT
                        │                                         │
                        ▼                                         ▼
                 Telegram File                             Telegram File
                    Service                                   Service
                        │                                         │
                        └────────────────────┬────────────────────┘
                                             ▼
                                      Document Parser (PDF / DOCX)
                                             │
                                             ▼
                                      Text Normalizer
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │   JD Analyzer   │ (AI Multi-Model Engine)
                                    └────────┬────────┘
                                             │
                                             ▼
                                    Schema Validator (Type & enum check)
                                             │
                                             ▼
                                    JD Rule Validator (Semantic consistency)
                                             │
                                             ▼
                                    Priority Normalizer (Multiplier formula)
                                             │
                                             ▼
                                  🔒 FROZEN JD PROFILE (Single Source of Truth)
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │ Resume Analyzer │ (Anti-Hallucination Extractor)
                                    └────────┬────────┘
                                             │
                                    ┌────────┴────────┐
                                    ▼                 ▼
                             Keyword & Context   Experience Matcher
                                Evidence             (Years & Date parsing)
                                    │                 │
                                    └────────┬────────┘
                                             ▼
                                    Evidence Matcher (1-to-1 deterministic mapping)
                                             │
                                             ▼
                                    Scoring Engine (Weighted Sum + Bounded Penalty)
                                             │
                        ┌────────────────────┴────────────────────┐
                        ▼                                         ▼
                 Gap & Course Engine                       Ranking Engine
             (Priority-ordered blueprints)             (Fair sorting & explanation)
                        │                                         │
                        └────────────────────┬────────────────────┘
                                             ▼
                                    Telegram Formatter (Safe chunking & escaping)
                                             │
                                             ▼
                                    Interactive Q&A Follow-up Router
```

---

## 🔎 Detailed Step-by-Step Lifecycle

### 1. Telegram Ingestion & File Stream Isolation
* **Modules:** [`src/bot/telegramBot.js`](file:///c:/Hashira/src/bot/telegramBot.js), [`src/services/telegramFileService.js`](file:///c:/Hashira/src/services/telegramFileService.js)
* **Execution:**
  1. The bot accepts text, PDF, or DOCX documents.
  2. `TelegramFileService` streams the file from Telegram's CDN directly to a temporary path, invokes document extraction, and guarantees immediate deletion upon completion to protect candidate privacy and server disk space.

### 2. Input Validation Layer
* **Module:** [`src/services/inputValidator.js`](file:///c:/Hashira/src/services/inputValidator.js)
* **Execution:**
  - Validates minimum text length ($\ge 30$ chars), maximum character boundaries, supported file extensions (`.pdf`, `.docx`, `.doc`, `.txt`), and file size thresholds ($\le 10\text{MB}$).
  - Returns immediate, friendly user messages if a document is empty or corrupted.

### 3. Session Management & Multi-Session Tracking
* **Module:** [`src/services/sessionService.js`](file:///c:/Hashira/src/services/sessionService.js)
* **Execution:**
  - Tracks individual recruiting sessions keyed by `sessionId` with TTL auto-expiration.
  - Keeps in-memory maps for instant response times with seamless MongoDB persistence.

### 4. Semantic JD Extraction, Schema Validation & Multiplier Normalization
* **Modules:** [`src/services/jdAnalyzer.js`](file:///c:/Hashira/src/services/jdAnalyzer.js), [`src/services/schemaValidator.js`](file:///c:/Hashira/src/services/schemaValidator.js), [`src/services/jdValidator.js`](file:///c:/Hashira/src/services/jdValidator.js)
* **Execution:**
  1. **AI Extraction:** Categorizes requirements into `TECHNICAL`, `EXPERIENCE`, `EDUCATION`, `CERTIFICATION`, `DOMAIN`, `SOFT_SKILL`.
  2. **Schema Sanitization:** Ensures priorities match strict enums.
  3. **Consistency Validation:** Detects primary role technologies (e.g. *"Java Developer"* $\rightarrow$ Java is `CRITICAL`) and preferred bonuses (*"Python is a plus"* $\rightarrow$ Python is `PREFERRED`).
  4. **Dynamic Relative Multipliers:**
     - `CRITICAL` = $5.0$
     - `HIGH` = $3.0$
     - `MEDIUM` = $1.5$
     - `PREFERRED` / `LOW` = $0.5$
     $$\text{Weight}_i = \frac{\text{Multiplier}_i}{\sum \text{Multipliers}}$$
  5. **Freezing:** The resulting structured profile is locked and reused across all candidates.

### 5. Resume Evidence & Mathematical Experience Matching
* **Modules:** [`src/services/resumeAnalyzer.js`](file:///c:/Hashira/src/services/resumeAnalyzer.js), [`src/services/experienceMatcher.js`](file:///c:/Hashira/src/services/experienceMatcher.js)
* **Execution:**
  1. Extracts candidate evidence strictly for frozen requirements with verbatim quotes and section citations.
  2. `ExperienceMatcher` extracts candidate years and calculates work history date ranges (e.g., `2021-2026` $\rightarrow$ 5 years), comparing them directly against JD requirements.
  3. Classifies evidence into `STRONG`, `MODERATE`, `WEAK` (course-only/tutorial), and `NO_EVIDENCE`.

### 6. Evidence Matcher (Isolated Mapping Layer)
* **Module:** [`src/services/evidenceMatcher.js`](file:///c:/Hashira/src/services/evidenceMatcher.js)
* **Execution:**
  Maps each requirement + evidence pair deterministically to match statuses and values:
  - `STRONG` $\rightarrow$ `STRONG_MATCH` ($1.0$)
  - `MODERATE` $\rightarrow$ `PARTIAL_MATCH` ($0.5$)
  - `WEAK` (Non-Critical) $\rightarrow$ `WEAK_MATCH` ($0.25$)
  - `WEAK` (Critical) $\rightarrow$ `CRITICAL_GAP` ($0.0$)
  - `NO_EVIDENCE` $\rightarrow$ `CRITICAL_GAP` ($0.0$) or `MISSING` ($0.0$)

### 7. Deterministic Weighted Scoring & Bounded Penalties
* **Module:** [`src/services/scoringEngine.js`](file:///c:/Hashira/src/services/scoringEngine.js)
* **Execution:**
  1. Base score: $\text{Raw Score} = \sum (\text{Weight}_i \times \text{MatchValue}_i) \times 100$
  2. Bounded penalty:
     $$\text{Penalty} = \min(\text{CriticalGapsCount} \times 25, 75)$$
     $$\text{Final Score} = \min(\text{Raw Score}, 100 - \text{Penalty})$$

### 8. Deterministic Priority-Aligned Course Engine
* **Module:** [`src/services/courseEngine.js`](file:///c:/Hashira/src/services/courseEngine.js)
* **Execution:**
  - Gaps are sorted strictly by JD importance:
    $$\text{Critical Gaps (HIGH)} \longrightarrow \text{High Gaps (MEDIUM)} \longrightarrow \text{Preferred Gaps (LOW)}$$
  - AI generates realistic curriculum titles and explanations without altering the deterministic order.

### 9. Multi-Candidate Ranking & Tie-Breaker Engine
* **Module:** [`src/services/rankingEngine.js`](file:///c:/Hashira/src/services/rankingEngine.js)
* **Execution:**
  - Candidates are sorted by:
    1. Critical gaps count ascending ($0$ critical gaps beats $\ge 1$ gap).
    2. Overall weighted score descending.
    3. Important gaps count ascending.
    4. Stable candidate order.

### 10. Interactive Delivery, Message Chunking & Grounded Follow-up Q&A
* **Modules:** [`src/bot/formatters.js`](file:///c:/Hashira/src/bot/formatters.js), [`src/services/followupService.js`](file:///c:/Hashira/src/services/followupService.js)
* **Execution:**
  - Reports exceeding Telegram's 4096-character limit are automatically chunked without truncating.
  - Recruiters can ask natural follow-up questions (e.g. *"Why did Candidate 1 rank first?"*), which `FollowupService` answers using only stored evaluation records.
