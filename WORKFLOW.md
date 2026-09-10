# Production Architecture & Workflow Specification

## AI-Powered Resume–Job Description Matching Telegram Bot

This document defines the complete production-oriented architecture and end-to-end execution workflow for an AI-powered Resume–Job Description (JD) matching system delivered through a real Telegram Bot.

The system is designed to analyze one or multiple resumes against one or multiple job descriptions, determine requirement-level evidence, calculate deterministic ATS-style scores, identify priority-aligned skill gaps, recommend learning paths, rank candidates fairly, and answer grounded follow-up questions.

The architecture deliberately separates **AI interpretation** from **deterministic business logic**:

> **AI understands and extracts. Backend validates, scores, ranks, and controls priority.**

This prevents hallucinated evidence, inconsistent scoring, priority inversion, and unfair candidate comparisons.

---

# 1. High-Level System Architecture

```text
                         📱 TELEGRAM
                    Mobile / Web / Desktop
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Telegram Bot API    │
                   │      Telegraf       │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │   Input Validator   │
                   │ format / size /     │
                   │ state / content     │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │   Session Service   │
                   │ Memory + MongoDB    │
                   └──────────┬──────────┘
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
            📝 JD INPUT              📄 RESUME INPUT
                 │                         │
                 ▼                         ▼
        Telegram File Service     Telegram File Service
                 │                         │
                 └────────────┬────────────┘
                              ▼
                    ┌─────────────────┐
                    │ Document Parser │
                    │ PDF / DOCX/TXT  │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │ Text Normalizer │
                    └────────┬────────┘
                             │
                  ┌──────────┴──────────┐
                  │                     │
                  ▼                     │
          ┌─────────────────┐            │
          │   JD Analyzer   │            │
          │      AI         │            │
          └────────┬────────┘            │
                   ▼                     │
          Schema Validation              │
                   ▼                     │
          JD Rule Validator              │
                   ▼                     │
          Priority Normalizer            │
                   ▼                     │
        🔒 FROZEN JD PROFILE             │
                   │                     │
                   └──────────┬──────────┘
                              ▼
                    ┌─────────────────┐
                    │ Resume Analyzer │
                    │ AI Evidence     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         Keyword &      Semantic       Experience
          Context        Matching        Matcher
          Evidence                      & Dates
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    Evidence Matcher
                             ▼
                    Scoring Engine
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
       Gap & Course Engine           Ranking Engine
              │                             │
              └──────────────┬──────────────┘
                             ▼
                    Result Aggregator
                             ▼
                    Error / Recovery
                       Verification
                             ▼
                    Telegram Formatter
                             ▼
                  Interactive Telegram UI
                             │
                             ▼
                    Follow-up Q&A Router
                             │
                             ▼
                 Stored Session / Results
```

---

# 2. Core Architectural Principles

## 2.1 AI Does Not Control Final Scoring

The AI is responsible for:

* semantic understanding
* requirement extraction
* evidence interpretation
* contextual classification
* explanation generation

The backend is responsible for:

* validation
* priority normalization
* weighting
* evidence-to-score mapping
* critical-gap penalties
* ranking
* course ordering
* final score calculation

Therefore:

```text
AI Output
   ↓
Validate
   ↓
Normalize
   ↓
Deterministic Engine
   ↓
Final Result
```

---

# 3. Project Structure

```text
Hashira/
│
├── src/
│   ├── index.js
│   ├── app.js
│   │
│   ├── config/
│   │   └── index.js
│   │
│   ├── db/
│   │   └── connection.js
│   │
│   ├── models/
│   │   ├── Session.js
│   │   └── CandidateAnalysis.js
│   │
│   ├── bot/
│   │   ├── telegramBot.js
│   │   ├── keyboards.js
│   │   └── formatters.js
│   │
│   └── services/
│       ├── inputValidator.js
│       ├── telegramFileService.js
│       ├── documentParser.js
│       ├── textNormalizer.js
│       │
│       ├── aiService.js
│       ├── schemaValidator.js
│       ├── jdAnalyzer.js
│       ├── jdValidator.js
│       ├── jdNormalizer.js
│       │
│       ├── resumeAnalyzer.js
│       ├── experienceMatcher.js
│       ├── evidenceMatcher.js
│       ├── embeddingService.js
│       │
│       ├── scoringEngine.js
│       ├── courseEngine.js
│       ├── gapEngine.js
│       ├── rankingEngine.js
│       │
│       ├── queueService.js
│       ├── sessionService.js
│       ├── resultService.js
│       ├── followupService.js
│       └── errorRecoveryService.js
│
├── tests/
│   ├── fixtures/
│   │   ├── sample_jds.js
│   │   └── sample_resumes.js
│   │
│   ├── jdAnalyzer.test.js
│   ├── jdValidator.test.js
│   ├── experienceMatcher.test.js
│   ├── evidenceMatcher.test.js
│   ├── scoringEngine.test.js
│   ├── courseEngine.test.js
│   ├── rankingEngine.test.js
│   ├── errorRecovery.test.js
│   └── e2e_pipeline.test.js
│
├── .env
├── .env.example
├── .gitignore
├── Procfile
├── package.json
└── README.md
```

---

# 4. Step-by-Step Execution Lifecycle

## Step 1 — Telegram Ingestion

### Modules

```text
src/bot/telegramBot.js
src/bot/keyboards.js
src/services/telegramFileService.js
```

The recruiter starts the application using:

```text
/start
```

The bot presents:

```text
🤖 Resume Match AI

What would you like to do?

📝 Add Job Description
📄 Upload Resume
📊 View Results
🆕 New Analysis
❓ Help
```

The recruiter may provide:

* JD as text
* JD as PDF
* JD as DOCX
* Resume as PDF
* Resume as DOCX

Telegram is the actual application interface.

No React frontend is required.

---

# 5. Step 2 — Input Validation

### Module

```text
src/services/inputValidator.js
```

Before processing:

```text
Input
 ↓
File type validation
 ↓
File size validation
 ↓
Content validation
 ↓
Session-state validation
 ↓
Accepted / Rejected
```

Validate:

* supported extensions
* maximum file size
* minimum extracted text length
* empty documents
* corrupt documents
* duplicate uploads
* maximum candidates per analysis
* JD/resume order
* invalid session state

Example:

```text
❌ This document contains no readable text.

Please upload a valid PDF/DOCX resume.
```

---

# 6. Step 3 — Telegram File Service

### Module

```text
src/services/telegramFileService.js
```

Flow:

```text
Telegram file_id
      ↓
Telegram getFile()
      ↓
Temporary server file
      ↓
Document Parser
      ↓
Extraction complete
      ↓
Temporary file deleted
```

Temporary files must be deleted using guaranteed cleanup logic even when parsing fails.

```text
try
   process file
finally
   delete temporary file
```

The system must not permanently retain uploaded documents unless explicitly required by the application's persistence policy.

---

# 7. Step 4 — Document Parsing

### Module

```text
src/services/documentParser.js
```

Supported formats:

```text
PDF  → pdf-parse
DOCX → mammoth
TXT  → direct processing
```

Unsupported formats are rejected.

The parser returns:

```json
{
  "text": "...",
  "fileType": "pdf",
  "characterCount": 12450
}
```

---

# 8. Step 5 — Text Normalization

### Module

```text
src/services/textNormalizer.js
```

Normalize:

* redundant whitespace
* repeated line breaks
* broken formatting
* invisible characters
* malformed Unicode
* excessive spaces

However, normalization must **not destroy meaningful section boundaries or dates**.

The normalized text is passed to the intelligence pipeline.

---

# 9. Step 6 — JD Intelligence Pipeline

### Modules

```text
src/services/aiService.js
src/services/jdAnalyzer.js
src/services/schemaValidator.js
src/services/jdValidator.js
src/services/jdNormalizer.js
```

Pipeline:

```text
Raw JD
 ↓
AI Semantic Analysis
 ↓
Schema Validation
 ↓
Rule Validation
 ↓
Priority Normalization
 ↓
Frozen JD Profile
```

The AI extracts:

* Job title
* Primary role
* Responsibilities
* Technologies
* Required experience
* Education
* Certifications
* Domain requirements
* Soft skills
* Other requirements
* Proposed priorities

Requirement categories:

```text
TECHNICAL
EXPERIENCE
EDUCATION
CERTIFICATION
DOMAIN
SOFT_SKILL
RESPONSIBILITY
OTHER
```

---

# 10. Step 7 — JD Anti-Inversion Validator

### Module

```text
src/services/jdValidator.js
```

The validator cross-checks AI output against the original JD.

Example:

```text
Job Title:
Senior Java Backend Developer

JD:
Java is required.
Python knowledge is a plus.
```

The system must produce:

```text
Java   → CRITICAL
Python → PREFERRED
```

If the AI incorrectly produces:

```text
Python → CRITICAL
Java   → PREFERRED
```

the validator corrects the contradiction.

Similarly:

```text
Python Developer
Java is a plus
```

must dynamically produce:

```text
Python → CRITICAL
Java   → PREFERRED
```

There is **no hardcoded Java-first rule**.

---

# 11. Step 8 — Priority Normalization

Priority multipliers:

```text
CRITICAL  = 5.0
HIGH      = 3.0
MEDIUM    = 1.5
PREFERRED = 0.5
LOW       = 0.5
```

For every requirement:

```text
Weightᵢ = Multiplierᵢ / Sum(All Multipliers)
```

This produces dynamic weights.

Example:

```text
Java        CRITICAL   5.0
Spring Boot HIGH       3.0
SQL         HIGH       3.0
Python      PREFERRED  0.5
```

The weights are calculated from this JD rather than using fixed percentages.

---

# 12. Step 9 — Freeze the JD Profile

The validated and normalized profile becomes:

```text
🔒 FROZEN JD PROFILE
```

It contains:

```json
{
  "jobTitle": "Java Backend Developer",
  "requirements": [],
  "priorities": [],
  "weights": [],
  "experienceRequirements": [],
  "createdAt": "...",
  "frozen": true
}
```

Once frozen:

> The JD profile must not be regenerated independently for each candidate.

Every candidate receives the exact same:

* requirements
* priorities
* multipliers
* weights
* scoring rules

This guarantees fair comparison.

---

# 13. Step 10 — Resume Intelligence Pipeline

### Module

```text
src/services/resumeAnalyzer.js
```

For each resume:

```text
Resume
 ↓
Frozen JD Profile
 ↓
Requirement-specific evidence extraction
```

The analyzer must evaluate only evidence contained in the provided resume.

Evidence levels:

```text
STRONG
MODERATE
WEAK
NO_EVIDENCE
```

### STRONG

Examples:

* production experience
* building systems
* maintaining applications
* architecture
* substantial professional experience

### MODERATE

Examples:

* internship
* academic project
* hands-on implementation
* limited professional exposure

### WEAK

Examples:

* course
* tutorial
* hobby
* introductory project
* stated interest

### NO_EVIDENCE

The resume contains no supporting evidence.

The system must say:

```text
No evidence found in the provided resume.
```

It must never claim:

```text
Candidate does not know AWS.
```

because absence of evidence is not proof of absence.

---

# 14. Step 11 — Evidence Source Tracking

Evidence should include its origin.

Example:

```json
{
  "skill": "Java",
  "strength": "STRONG",
  "section": "Work Experience",
  "evidenceText": "Developed Java Spring Boot microservices..."
}
```

This allows the final report to explain **why** a skill was matched.

---

# 15. Step 12 — Experience Matcher

### Module

```text
src/services/experienceMatcher.js
```

The system extracts:

* employment dates
* internship dates
* project duration
* relevant technology duration
* total relevant experience

Example:

```text
JD:
5+ years Java experience

Resume:
Java Developer
2021–2026

Result:
≈ 5 years
→ Strong experience alignment
```

Course-only evidence must never be interpreted as equivalent to professional experience.

---

# 16. Step 13 — Semantic Matching

### Module

```text
src/services/embeddingService.js
```

Semantic matching allows related concepts to be recognized.

Example:

```text
JD:
Develop RESTful backend services.

Resume:
Built Spring Boot microservices exposing REST APIs.
```

The system can identify the semantic relationship even when exact wording differs.

The semantic layer is supplemental.

It must **never override explicit JD priority**.

---

# 17. Step 14 — Evidence Matcher

### Module

```text
src/services/evidenceMatcher.js
```

Mapping:

| Evidence                   | Match         | Value |
| -------------------------- | ------------- | ----: |
| STRONG                     | STRONG_MATCH  |  1.00 |
| MODERATE                   | PARTIAL_MATCH |  0.50 |
| WEAK                       | WEAK_MATCH    |  0.25 |
| WEAK + CRITICAL            | CRITICAL_GAP  |  0.00 |
| NO_EVIDENCE + CRITICAL     | CRITICAL_GAP  |  0.00 |
| NO_EVIDENCE + non-critical | MISSING       |  0.00 |

The matcher operates deterministically after evidence extraction.

---

# 18. Step 15 — Deterministic Scoring Engine

### Module

```text
src/services/scoringEngine.js
```

Base score:

```text
Raw Score =
Σ(Requirement Weight × Match Value) × 100
```

Critical-gap penalty:

```text
Penalty =
min(CriticalGapCount × 25, 75)
```

Final score:

```text
Final Score =
min(Raw Score, 100 - Penalty)
```

Scores are bounded:

```text
0 ≤ Final Score ≤ 100
```

---

# 19. Step 16 — Match Verdict

Recommended verdict bands:

```text
90–100 → Excellent Match
80–89  → Strong Match
68–79  → Good Match
50–67  → Moderate Match
35–49  → Weak Match
0–34   → Poor Match
```

A candidate with critical gaps cannot receive an unrestricted high score merely because they possess many preferred skills.

---

# 20. Step 17 — Gap Engine

### Module

```text
src/services/gapEngine.js
```

Identify:

```text
CRITICAL GAPS
HIGH-PRIORITY GAPS
MEDIUM GAPS
PREFERRED GAPS
```

The gap engine uses the frozen JD profile.

It does not allow the AI to reorder gaps arbitrarily.

---

# 21. Step 18 — Course Recommendation Engine

### Module

```text
src/services/courseEngine.js
```

Course recommendations are determined by actual JD gaps.

Ordering:

```text
CRITICAL GAP
      ↓
HIGH GAP
      ↓
MEDIUM GAP
      ↓
PREFERRED GAP
```

Example:

```text
Java        → CRITICAL → HIGH learning priority
Spring Boot → HIGH     → MEDIUM learning priority
Python      → PREFERRED → LOW learning priority
AWS         → PREFERRED → LOW learning priority
```

Therefore:

```text
Java course
   ↓
Spring Boot course
   ↓
Python/AWS
```

AI may generate:

* curriculum title
* learning rationale
* suggested topics
* explanation

AI may **not change the deterministic ordering**.

---

# 22. Step 19 — Multi-Candidate Ranking

### Module

```text
src/services/rankingEngine.js
```

Ranking order:

```text
1. Critical gaps ASC
2. Final score DESC
3. Important gaps ASC
4. Core requirement score DESC
5. Experience match DESC
6. ATS score DESC
7. Stable candidate order
```

Example:

```text
Candidate A
Score: 87
Critical gaps: 0

Candidate B
Score: 92
Critical gaps: 1
```

Candidate A may rank above Candidate B because:

```text
0 critical gaps < 1 critical gap
```

This prevents high scores caused by optional/preferred skills from hiding missing core requirements.

---

# 23. Step 20 — Candidate Failure Isolation

Every candidate is processed independently.

Example:

```text
Candidate 1 → SUCCESS
Candidate 2 → CORRUPTED PDF
Candidate 3 → AI TIMEOUT
```

The system must not terminate the entire batch.

Result:

```text
Candidate 1 → analyzed
Candidate 2 → failed
Candidate 3 → retrying
```

After retry:

```text
Candidate 3 → analyzed
```

Final:

```text
2 / 3 candidates successfully analyzed.
```

---

# 24. Step 21 — Error, Retry & Recovery Service

### Module

```text
src/services/errorRecoveryService.js
```

Handles:

* AI timeout
* AI rate-limit errors
* malformed AI JSON
* parser failures
* Telegram API failures
* database failures
* temporary file failures

Retry policy:

```text
Attempt 1
   ↓
Failure
   ↓
Controlled retry
   ↓
Attempt 2
   ↓
Failure
   ↓
Mark operation FAILED
```

Never retry indefinitely.

Each failure should receive a structured error type:

```text
AI_TIMEOUT
AI_INVALID_RESPONSE
DOCUMENT_PARSE_ERROR
UNSUPPORTED_FILE
TELEGRAM_ERROR
DATABASE_ERROR
UNKNOWN_ERROR
```

---

# 25. Step 22 — Controlled Concurrency

### Module

```text
src/services/queueService.js
```

Default:

```text
MAX_CONCURRENT_ANALYSES=3
```

For five resumes:

```text
Resume 1 ─┐
Resume 2 ─┼─ Batch 1
Resume 3 ─┘

Resume 4 ─┐
Resume 5 ─┘ Batch 2
```

This prevents excessive AI/API requests and resource exhaustion.

---

# 26. Step 23 — Real-Time Telegram Progress

The bot should edit a single progress message where possible.

Example:

```text
🔄 Processing...

✓ Job Description received
✓ Extracting requirements
✓ Identifying core technologies
✓ Validating priorities
✓ JD profile locked

📄 Candidate 1/3
✓ Evidence extracted

📄 Candidate 2/3
🔄 Analyzing...

📄 Candidate 3/3
⏳ Waiting...

📊 Comparing candidates...
🎓 Preparing recommendations...

✅ Analysis complete!
```

Progress messages must represent actual pipeline states rather than artificial delays.

---

# 27. Step 24 — Result Aggregation

### Module

```text
src/services/resultService.js
```

Aggregates:

```text
JD Profile
+
Candidate Evidence
+
Requirement Matches
+
Scores
+
Gaps
+
Recommendations
+
Ranking
```

Example structured result:

```json
{
  "overallScore": 87,
  "verdict": "Strong Match",
  "criticalGaps": 0,
  "subscores": {
    "skillsMatch": 91,
    "experienceMatch": 84,
    "educationMatch": 82,
    "atsFormatting": 90
  },
  "strengths": [],
  "gaps": [],
  "recommendations": []
}
```

Structured numeric results should be retained even if charts are not implemented initially.

This enables future:

* score gauges
* bar charts
* radar charts
* candidate comparisons
* Telegram-generated visual reports
* Mini App visualizations

without changing the scoring architecture.

---

# 28. Step 25 — Telegram Formatter

### Module

```text
src/bot/formatters.js
```

Responsibilities:

* Markdown escaping
* emoji status indicators
* safe formatting
* message chunking
* score presentation
* candidate summaries
* detailed reports
* inline buttons

Example:

```text
🏆 Candidate Ranking

🥇 Candidate 1 — 87%
   Strong Match
   Critical Gaps: 0

🥈 Candidate 2 — 81%
   Strong Match
   Critical Gaps: 0

🥉 Candidate 3 — 63%
   Moderate Match
   Critical Gaps: 1
```

---

# 29. Step 26 — Telegram Message Chunking

Telegram messages have a maximum message size.

Long reports must be split safely.

```text
Full Report
     ↓
Formatter
     ↓
Safe chunks
     ↓
Telegram
```

Never cut:

* JSON
* evidence quotes
* Markdown syntax
* candidate sections

in the middle of a logical structure.

---

# 30. Step 27 — Interactive Telegram Controls

Example:

```text
📊 Analysis Complete

[🏆 Ranking]
[👤 Candidate Details]
[📋 Compare Candidates]
[🎓 Improvement Plan]
[🔍 Show Gaps]
[🆕 New Analysis]
```

Candidate detail:

```text
[◀ Previous] [Next ▶]
```

This makes Telegram behave like an application rather than a generic chatbot.

---

# 31. Step 28 — Grounded Follow-Up Q&A

### Module

```text
src/services/followupService.js
```

Flow:

```text
User Question
      ↓
Follow-up Router
      ↓
Existing Session
      ↓
Frozen JD Profile
      ↓
Stored Candidate Results
      ↓
Grounded Answer
```

Supported questions:

```text
Why did Candidate 2 rank below Candidate 1?

Why is Java more important than Python?

What are Candidate 1's biggest gaps?

Which candidate has no critical gaps?

Why did Candidate 3 lose points?

What should Candidate 1 learn first?
```

The service must answer from stored evaluation records.

It must not silently re-analyze the JD and produce a different scoring model.

---

# 32. Step 29 — Session Management

### Module

```text
src/services/sessionService.js
src/models/Session.js
```

A recruiter can maintain multiple independent analyses:

```text
Telegram Chat
    │
    ├── Session A
    │     └── Java JD + 3 resumes
    │
    ├── Session B
    │     └── Python JD + 5 resumes
    │
    └── Session C
          └── Data Analyst JD + 2 resumes
```

Each analysis receives a unique `sessionId`.

The session stores:

```text
sessionId
chatId
state
JD text
Frozen JD Profile
Resume metadata
Candidate results
Ranking
timestamps
```

---

# 33. Step 30 — Session State Machine

```text
IDLE
 │
 ▼
WAITING_FOR_JD
 │
 ▼
ANALYZING_JD
 │
 ▼
JD_READY
 │
 ▼
WAITING_FOR_RESUMES
 │
 ▼
ANALYZING_RESUMES
 │
 ▼
COMPARING
 │
 ▼
COMPLETED
```

Error state:

```text
ANY STATE
   ↓
RECOVERABLE_ERROR
   ↓
RETRY / RETURN TO PREVIOUS SAFE STATE
```

---

# 34. Step 31 — New Analysis / Reset

The bot must provide:

```text
/new
/reset
```

Example:

```text
🆕 New Analysis

Previous analysis remains saved.

Please provide the new Job Description.
```

This prevents users from becoming trapped inside an old workflow.

---

# 35. Step 32 — Session Expiration

Inactive sessions should expire automatically.

Recommended:

```text
Session TTL
24 hours
```

MongoDB TTL indexes can remove expired temporary session data.

Long-term result retention should be handled separately from temporary workflow state.

---

# 36. Step 33 — Database Persistence

### MongoDB

Models:

```text
Session
CandidateAnalysis
```

Persistence ensures that a recruiter can ask follow-up questions without re-uploading files or recalculating the analysis.

The database stores structured analysis results rather than requiring the AI to regenerate them.

---

# 37. Step 34 — Health Monitoring

### Express

The backend exposes:

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

This allows deployment platforms and monitoring systems to verify that the Node.js service is alive.

---

# 38. Step 35 — Security

Sensitive configuration must exist only in `.env`.

Example:

```env
TELEGRAM_BOT_TOKEN=
MONGODB_URI=
AI_PROVIDER=gemini
GEMINI_API_KEY=
OPENAI_API_KEY=
PORT=3000
BOT_MODE=polling
MAX_CONCURRENT_ANALYSES=3
AI_TIMEOUT=60000
MAX_FILE_SIZE=10485760
```

Never:

* hardcode API keys
* print API keys in logs
* send secrets to Telegram
* commit `.env`
* store unnecessary temporary files
* expose raw candidate documents publicly

`.gitignore` must include:

```text
.env
node_modules/
temp/
logs/
```

---

# 39. Step 36 — AI Provider Abstraction

### Module

```text
src/services/aiService.js
```

The application should expose one internal AI interface:

```text
analyzeJD()
analyzeResume()
generateExplanation()
generateCourseAdvice()
answerFollowup()
```

The implementation can use:

```text
Gemini
or
OpenAI
```

The rest of the application should not depend directly on provider-specific response formats.

This makes changing AI providers possible without rewriting the scoring system.

---

# 40. Step 37 — Testing Strategy

Mandatory tests:

### JD Priority Tests

```text
Java-primary JD
→ Java CRITICAL
→ Python PREFERRED
```

```text
Python-primary JD
→ Python CRITICAL
→ Java PREFERRED
```

### Evidence Tests

```text
Professional experience
→ STRONG

Internship/project
→ MODERATE

Course/tutorial
→ WEAK

Not mentioned
→ NO_EVIDENCE
```

### Scoring Tests

```text
Critical gap
→ significant score restriction
```

### Fairness Tests

```text
Candidate 1
Candidate 2
Candidate 3

→ same frozen JD profile
→ same weights
→ same scoring rules
```

### Course Tests

```text
Critical gap
→ recommended before preferred gap
```

### Ranking Tests

```text
Critical gaps ASC
→ score DESC
→ important gaps ASC
→ stable ordering
```

### Failure Tests

```text
Candidate 1 success
Candidate 2 parser failure
Candidate 3 AI timeout

→ Candidate 1 still returned
→ Candidate 3 retried
→ Candidate 2 isolated
```

### Follow-Up Tests

```text
Question
→ stored session
→ stored JD
→ stored analysis
→ grounded answer
```

---

# 41. Step 38 — End-to-End Telegram Test

The final test must use the actual Telegram application.

Test on:

```text
📱 Telegram Mobile
💻 Telegram Web
🖥️ Telegram Desktop
```

Verify:

```text
/start
 ↓
JD upload
 ↓
JD analysis
 ↓
JD frozen
 ↓
Resume 1
 ↓
Resume 2
 ↓
Resume 3
 ↓
Progress updates
 ↓
Scoring
 ↓
Ranking
 ↓
Course recommendations
 ↓
Follow-up question
 ↓
New analysis
```

Unit tests alone are insufficient.

---

# 42. Complete Data Flow

```text
Telegram User
      ↓
Telegram Bot API
      ↓
Telegraf
      ↓
Input Validator
      ↓
Session Service
      ↓
Telegram File Service
      ↓
Document Parser
      ↓
Text Normalizer
      ↓
JD Analyzer
      ↓
Schema Validator
      ↓
JD Rule Validator
      ↓
Priority Normalizer
      ↓
🔒 Frozen JD Profile
      ↓
Resume Analyzer
      ↓
Evidence Extraction
      ↓
Keyword Matching
      ↓
Semantic Matching
      ↓
Experience Matching
      ↓
Evidence Matcher
      ↓
Deterministic Scoring
      ↓
Gap Engine
      ↓
Course Engine
      ↓
Ranking Engine
      ↓
Result Aggregator
      ↓
Error/Recovery Verification
      ↓
Telegram Formatter
      ↓
Interactive Report
      ↓
Follow-up Q&A
```

---

# 43. Final Architecture Rules

The following rules are mandatory:

### Rule 1 — No hardcoded technology priority

Never assume:

```text
Java > Python
```

or:

```text
Python > Java
```

Priority must come from the JD.

### Rule 2 — Frozen JD

One JD produces one immutable evaluation profile.

### Rule 3 — Same profile for every candidate

Candidate A and Candidate B must use identical:

```text
requirements
priorities
weights
scoring rules
penalties
```

### Rule 4 — No hallucinated evidence

Missing evidence means:

```text
No evidence found in the provided resume.
```

### Rule 5 — Course evidence is not professional experience

A course alone cannot produce STRONG professional evidence.

### Rule 6 — AI cannot determine final ranking

The deterministic ranking engine owns ranking.

### Rule 7 — AI cannot reorder courses

The frozen JD priority determines course ordering.

### Rule 8 — Candidate failures are isolated

One broken resume must never terminate the entire batch.

### Rule 9 — Temporary documents are cleaned up

Uploaded files must not remain on disk unnecessarily.

### Rule 10 — Follow-ups use stored results

Follow-up answers must be grounded in the existing session and frozen JD profile.

---

# 44. Final Production Stack

```text
Frontend / UI:
Telegram

Telegram Integration:
Telegram Bot API
Telegraf

Backend:
Node.js
Express.js

Database:
MongoDB
Mongoose

AI:
Gemini / OpenAI

Document Processing:
pdf-parse
mammoth

Concurrency:
p-limit

Configuration:
dotenv

Testing:
Jest / Node Test Runner

Deployment:
Node.js-compatible hosting
```

No React frontend is required.

No Python backend is required.

Telegram itself is the application's user interface.

---

# 45. Final Success Criteria

The system is considered complete only when it can successfully perform:

```text
1 JD + 1 Resume
        ↓
Complete ATS analysis
```

```text
1 JD + Multiple Resumes
        ↓
Individual analysis
        ↓
Fair ranking
        ↓
Comparative report
```

```text
Multiple JDs + 1 Resume
        ↓
JD-by-JD analysis
        ↓
Best-fit ranking
```

```text
JD:
Java primary
Python preferred

        ↓

Java gets higher priority.
```

```text
JD:
Python primary
Java preferred

        ↓

Python gets higher priority.
```

```text
Missing Critical Skill
        ↓
Critical Gap
        ↓
Score restriction
        ↓
Priority learning recommendation
```

```text
Course-only evidence
        ↓
WEAK
        ↓
Not professional experience
```

```text
Missing resume evidence
        ↓
NO_EVIDENCE
        ↓
"No evidence found in the provided resume."
```

```text
Candidate failure
        ↓
Isolated
        ↓
Other candidates continue
```

```text
Follow-up question
        ↓
Existing session
        ↓
Frozen JD + stored analysis
        ↓
Grounded answer
```

---

# 46. Final System Philosophy

The system should behave as a **deterministic recruitment decision-support application enhanced by AI**, not as an LLM that simply generates a score.

The final authority chain is:

```text
                    AI
                     │
             Understanding
                     │
                     ▼
              Structured Data
                     │
                     ▼
             Validation Layer
                     │
                     ▼
             Frozen JD Profile
                     │
                     ▼
             Evidence Extraction
                     │
                     ▼
          Deterministic Match Engine
                     │
                     ▼
             Deterministic Scoring
                     │
              ┌──────┴──────┐
              ▼             ▼
         Gap Engine    Ranking Engine
              │             │
              ▼             │
        Course Engine        │
              │             │
              └──────┬──────┘
                     ▼
              Final Results
                     │
                     ▼
               Telegram UI
```

**AI provides intelligence.  
Deterministic code provides consistency.  
The frozen JD provides fairness.  
Evidence provides explainability.  
Telegram provides the application interface.**
