# Code Execution & Review System Flow

This document explains the end-to-end architecture and workflow of the coding assessment system integrated with **stater_code** problem banks, **Judge0**, and **OpenAI**.

---

## 1. High-Level Architecture

```
Interviewer (FE)
      │  creates test + sends invite
      ▼
Backend (Node.js/Express)
      │  picks problems from DB (seeded from stater_code/)
      │  sends invite email with token link
      │
Candidate (FE) ──── /coding-challenge/:testId?token=<inviteToken>
      │  submits code
      ▼
Judge0 (sandbox execution) ──► OpenAI (qualitative review)
      │
      ▼
Submission saved → Interview Status API
```

**Components:**

| Layer | Role |
|---|---|
| `stater_code/easy.json`, `medium.json`, `hard.json` | Source of truth for problems, starter code templates, and test cases |
| `src/scripts/seedProblems.ts` | One-time seeder: upserts Problems + Testcases from JSON files |
| `src/scripts/migrateCodingTest.ts` | One-time migration: adds invite columns to `coding_test` table |
| **Backend (Express)** | Orchestrates flow, handles persistence, sends invite emails |
| **Judge0** | Sandbox code execution with resource limits (CPU/Memory) |
| **OpenAI (GPT-4)** | Qualitative code review and numeric grading |

---

## 2. Phase 0: Database Setup (Run Once)

### Step 1 — Migrate DB
```bash
npx ts-node src/scripts/migrateCodingTest.ts
```
Adds `candidate_email`, `invite_token`, `invite_expires_at`, `invite_sent_at` columns to `coding_test`.

### Step 2 — Seed Problems
```bash
npx ts-node src/scripts/seedProblems.ts
```
Reads all three JSON files and performs:
- **Problem**: upserted by `(title, difficulty)` — `baseCode` stores the `starter_code` map keyed by language (javascript, python, java, cpp, c, typescript, go).
- **Testcase**: first 2 test cases per problem are **visible** (`isHidden = false`), the rest are **hidden** (`isHidden = true`).

Re-running the seeder is safe (idempotent via `findOrCreate` + `update`).

---

## 3. Phase A: Test Configuration (Interviewer)

1. **Request**: `POST /api/v1/coding/tests`
   ```json
   { "title": "Senior Dev Round 1", "totalTime": 90, "difficultyDistribution": { "easy": 1, "medium": 2, "hard": 0 } }
   ```
2. **Problem Selection**: `CodingService.createTest()` queries the seeded `Problem` table and picks random problems matching the distribution using `ORDER BY RANDOM()`.
3. **Setup**: A `CodingTest` record is created; selected problems are linked via `CodingTestProblem`.

---

## 4. Phase B: Candidate Invite

1. **Request**: `POST /api/v1/coding/tests/:id/invite`
   ```json
   { "candidateEmail": "candidate@example.com", "expiresInHours": 48 }
   ```
2. **Token Generation**: A unique `crypto.randomUUID()` token is saved to `invite_token`; expiry is computed and saved to `invite_expires_at`.
3. **Email**: Nodemailer sends a branded HTML email with a link:
   ```
   https://<FRONTEND_BASE_URL>/coding-challenge/<testId>?token=<inviteToken>
   ```
4. **FE Entry Point**: The `CodingChallenge` component (lazy-loaded at `/coding-challenge/:challengeId?`) receives the `testId` and `token` and calls `GET /api/v1/coding/tests/:id/problems?token=<token>` to load problems with their starter code templates.

---

## 5. Phase C: Code Submission (Candidate)

1. **Submission**: Candidate submits via `POST /api/v1/coding/submissions`
   ```json
   { "problemId": 5, "code": "...", "languageId": 71, "testId": 12 }
   ```
2. **Test Case Retrieval**: All `Testcase` rows linked to the `Problem` are fetched (both visible and hidden).
3. **Execution**:
   - For each test case, the backend sends a request to **Judge0**.
   - Judge0 executes in a sandbox with resource limits (CPU/Memory).
   - Backend matches `stdout` against `expectedOutput`.
4. **Hidden Test Cases**: Results for hidden test cases omit `stdout`/`stderr` in the response.

---

## 6. Phase D: AI Review & Grading

1. **Review Request**: After all test cases run, `CodingService.processSubmission()` sends the code, problem description, and pass/fail results to **OpenAI**.
2. **AI Analysis**:
   - **Readability**: Code structure and naming.
   - **Complexity**: Big O efficiency and algorithmic logic.
   - **Edge Cases**: How well it handles non-standard inputs.
3. **Grading**: OpenAI returns a JSON object with a written `review` and a numeric `grade` (0–100).

---

## 7. Immediate Feedback Flow (Run Code)

1. **Request**: `POST /api/v1/coding/run-testcases`
   ```json
   { "problemId": 5, "code": "...", "languageId": 71 }
   ```
2. **Execution**: All test cases (both visible and hidden) are executed via **Judge0**.
3. **Difference**: No AI review is performed, and no `Submission` record is saved to the database. Results are returned immediately for UI feedback.

---

## 8. Phase E: Persistence & Status

1. **Save Result**: A `Submission` record is saved with aggregated status, full results JSON, and the AI review/grade.
2. **Interview Status API**: `GET /api/v1/coding/tests/:id/status?token=<inviteToken>`
   Returns:
   ```json
   {
     "test": { "id", "title", "status", "inviteExpiresAt", ... },
     "progress": { "totalProblems": 3, "completedProblems": 1, "overallCompleted": false },
     "problemStatuses": [{ "problemId", "submitted", "status", "grade" }],
     "submissions": [...]
   }
   ```

---

## 9. Database Schema

| Table | Key Fields |
|---|---|
| `problem` | `id`, `title`, `description`, `difficulty`, `tags` (JSON), `base_code` (JSON — starter templates per language) |
| `testcase` | `id`, `problem_id`, `input`, `expected_output`, `is_hidden` |
| `coding_test` | `id`, `interviewer_id`, `title`, `total_time`, `difficulty_distribution` (JSON), `status`, `candidate_email`, `invite_token`, `invite_expires_at`, `invite_sent_at` |
| `coding_test_problem` | `id`, `test_id`, `problem_id`, `order` |
| `submission` | `id`, `user_id`, `test_id`, `problem_id`, `code`, `language_id`, `status`, `results` (JSON), `openai_review`, `grade` |

---

## 10. API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/coding/problems` | JWT | List all seeded problems |
| `GET` | `/api/v1/coding/problems/:id` | JWT | Problem detail + sample test cases + starter code |
| `POST` | `/api/v1/coding/tests` | JWT (employer) | Create a coding test |
| `POST` | `/api/v1/coding/tests/:id/invite` | JWT (employer) | Send invite email to candidate |
| `GET` | `/api/v1/coding/tests/:id/problems` | Token or JWT | Get problems for a test (candidate view) |
| `GET` | `/api/v1/coding/tests/:id/status` | Token or JWT | Get interview status + progress |
| `POST` | `/api/v1/coding/submissions` | JWT | Submit code for execution + AI review |
| `POST` | `/api/v1/coding/run-testcases` | JWT | Run code against testcases without saving (for 'Run Code' button) |

---

## 11. Key Configurations (`.env`)

```env
# Judge0 (self-hosted instance — no API key required)
JUDGE0_API_URL=http://44.222.35.138:2358
# JUDGE0_API_KEY=  ← not needed for self-hosted

# OpenAI
OPENAI_API_KEY=

# SMTP (for invite emails)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@hirion.ai

# FE base URL (used to build invite links)
FRONTEND_BASE_URL=http://localhost:5173
```
