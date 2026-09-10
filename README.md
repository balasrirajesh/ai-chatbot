# 🤖 Hashira ResumeMatch AI — Telegram Bot

Production-quality MVP of an **AI-Powered Resume–Job Description Matching Telegram Bot** built with Node.js, Express, MongoDB, Telegraf, and Multi-LLM support (Google Gemini / OpenAI).

---

## 🌟 Key Features

1. **Context-Aware Job Description Parsing & Profiling**:
   - Understands true role context, distinguishing **Primary / Core Technologies** (`CRITICAL`) from secondary and nice-to-have (`PREFERRED` / `LOW`) skills.
   - Preserves and freezes structured JD profile to ensure 100% fair and consistent evaluation across all candidates.

2. **JD Consistency Validator (`src/services/jdValidator.js`)**:
   - Enforces deterministic linguistic sanity checks on AI extractions (e.g. guarantees Java in a Java role is prioritized as `CRITICAL`, while optional Python is labeled `PREFERRED`).

3. **Anti-Hallucination Evidence Matching (`src/services/resumeAnalyzer.js`)**:
   - Classifies candidate evidence into `STRONG`, `MODERATE`, `WEAK`, `NO_EVIDENCE`.
   - Distinguishes professional production experience from course-only tutorials or certs.
   - Replaces guesswork with strict reporting: *"No evidence found in the provided resume."*

4. **Deterministic Weighted Scoring Engine (`src/services/scoringEngine.js`)**:
   - Normalized calculation based on JD priority tiers ($\sum (\text{weight} \times \text{match\_value})$).
   - Penalizes and bounds candidates who miss core critical competencies.

5. **Priority-Aligned Learning Recommendations (`src/services/courseEngine.js`)**:
   - Course topics are deterministically ordered strictly according to the JD requirement hierarchy: **Critical Gaps $\rightarrow$ High Gaps $\rightarrow$ Preferred Gaps**.
   - Solves the Java vs. Python test with 100% mathematical guarantee.

6. **Multi-Candidate Comparative Ranking (`src/services/rankingEngine.js`)**:
   - Ranks multiple candidates fairly and generates clear human-readable explanations on why #1 was chosen.

7. **Mobile-First Responsive Telegram UX**:
   - Live editable status messages (`📄 Reading...` $\rightarrow$ `🧠 Understanding...` $\rightarrow$ `🔍 Scoring...` $\rightarrow$ `✅ Complete!`).
   - Rich inline action buttons, PDF & DOCX document parsing, and controlled concurrency with `p-limit`.

---

## 🏗️ Architecture

```text
                 📱 TELEGRAM (Mobile Client)
                         │
                         ▼
                  🤖 TELEGRAM BOT (Telegraf)
                         │
                         ▼
                  NODE.JS / EXPRESS
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   File Handler     Session Service    AI Service
        │                │                │
        ▼                ▼                ▼
 PDF/DOCX Parser      MongoDB       Gemini/OpenAI
        │                                 │
        └───────────────┬─────────────────┘
                        ▼
                  JD ANALYZER
                        │
                        ▼
                  JD VALIDATOR (Sanity & priority alignment)
                        │
                        ▼
              🔒 FROZEN JD PROFILE (Deterministic weight normalization)
                        │
                        ▼
                RESUME ANALYZER (Evidence extraction & Anti-hallucination)
                        │
                        ▼
                EVIDENCE MATCHER
                        │
                        ▼
                SCORING ENGINE (Deterministic calculation)
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        GAP ANALYZER        RANKING ENGINE
              │                   │
              ▼                   │
       COURSE ENGINE              │ (Deterministic priority + AI description)
              │                   │
              └─────────┬─────────┘
                        ▼
                  TELEGRAM OUTPUT (Status updates + formatted reports)
```

---

## 🚀 Quickstart & Setup

### 1. Prerequisites
- Node.js >= 18.0.0
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Gemini API Key (or OpenAI API Key)
- MongoDB instance (Local or MongoDB Atlas)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
PORT=3000
NODE_ENV=development

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCDefghIJKLmnOpQRstUVwxYz
BOT_MODE=polling

# AI Provider ("gemini" or "openai")
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/hashira_resume_bot
```

### 4. Run the Application
```bash
# Start server and bot polling
npm start

# Or with live auto-reload for development
npm run dev
```

### 5. Health Check
Verify API status at:
```text
http://localhost:3000/health
```

---

## 🧪 Automated Testing

Run the test suite verifying all mandatory requirements:
```bash
npm test
```

### Tests Covered:
- ✅ `jdAnalyzer.test.js`: Contextual extraction & primary tech detection
- ✅ `jdValidator.test.js`: Consistency enforcement preventing erroneous AI priority inversions
- ✅ `scoringEngine.test.js`: Deterministic score calculations & critical gap penalty
- ✅ `courseEngine.test.js`: Mandatory Java vs. Python priority verification (Spring Boot gap prioritized above Python gap)
- ✅ `rankingEngine.test.js`: Multi-candidate ranking with zero-critical gap priority
- ✅ `e2e_pipeline.test.js`: Full pipeline integration test across multiple candidates & file formats

---

## 📱 Telegram Usage Guide

1. Send `/start` to the bot.
2. **Send a Job Description**:
   - Paste JD text directly, or
   - Upload a `.pdf` / `.docx` file.
3. The bot analyzes the JD, identifies core technologies, and freezes the requirement profile.
4. **Upload Candidate Resumes**:
   - Send one or multiple resume files (`.pdf` or `.docx`).
5. Receive structured candidate match scores, strengths, categorized gaps, prioritized learning paths, and interactive ranking overviews!
