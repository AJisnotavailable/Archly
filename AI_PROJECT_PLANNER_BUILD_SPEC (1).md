# AI Project Planner & Prompt-to-Blueprint Generator
### Full Build Specification / Master Prompt for an AI Coding Agent

---

## 0. How to Use This Document

This file is written to be handed directly to an AI coding agent (Claude Code, Cursor, Windsurf, etc.) as a single build brief. It is organized so the agent can build in phases: read Sections 1–9 for *what* to build and *why*, Section 10 for the *actual internal prompts* the product will use to generate content, and Sections 11–20 for *how* to build it (schema, API, folders, roadmap).

**One-line brief to paste into an agent if you want a fast start:**

> Build a full-stack web app called "BluePrintAI". A user types one simple sentence describing a project idea. The app lets them pick an AI provider (OpenRouter, Groq, or NVIDIA NIM) and a free model from a live dropdown, then runs a 13-stage prompt-chain against that model to produce a complete project planning package: 12+ structured Markdown files (R&D, architecture, workflow, tech stack, DB schema, API spec, folder structure, roadmap, testing plan, deployment plan, risk register, README) plus one merged, styled PDF. Follow AI_PROJECT_PLANNER_BUILD_SPEC.md exactly for architecture, schemas, endpoints, and the exact meta-prompts to use for each generation stage.

---

## 1. Product Vision

**Name (working title):** BluePrintAI — "Prompt Maker" / Project Blueprint Generator

**Problem:** Founders, students, and developers have a project idea but freeze at "where do I even start." Turning "I want to build a fitness app" into a buildable spec normally takes hours of research, architecture decisions, and documentation.

**Solution:** A single-input tool. The user types one sentence. The system runs it through a chain of specialized AI calls, each producing one professional planning document, and packages everything into downloadable `.md` files and one polished PDF — effectively acting as a free AI co-founder / technical architect / PM in a box.

**Differentiator vs. "just ask ChatGPT":** structure, completeness, consistency, and multi-provider free-model access with zero vendor lock-in and zero cost to the end user (BYO free API key).

---

## 2. Core User Journey

1. User lands on the home screen and sees one big input: *"Describe what you want to build."*
2. User picks an **AI Provider** (OpenRouter / Groq / NVIDIA NIM) from a tab or select box.
3. A **Model dropdown** populates live from that provider's API, filtered to free models only.
4. User pastes their own free API key for the chosen provider (stored locally, never on server — see §7.6) or a saved key from a previous session.
5. User optionally answers 3–5 quick clarifying questions (target platform, audience, timeline, solo vs team) via a short form — skippable with smart defaults.
6. User clicks **Generate Blueprint**.
7. A live progress panel shows the 13-stage pipeline running stage-by-stage ("Researching market & competitors…", "Designing architecture…", "Writing API spec…"), with streamed tokens visible per stage.
8. On completion, user sees a file-tree of generated `.md` files + a "Download All (.zip)" and "Download PDF" button, plus an in-browser Markdown preview/reader with tabs per document.
9. User can regenerate any single section (e.g., just redo "Architecture") without rerunning the whole pipeline — cheaper and faster iteration.
10. Projects are saved to history (if the user is logged in / has local storage) so they can revisit, edit the original prompt, and re-run.

---

## 3. Functional Requirements

| # | Requirement |
|---|---|
| F1 | Accept one free-text prompt (10–2,000 characters) describing a project idea. |
| F2 | Let the user choose a provider: OpenRouter, Groq, or NVIDIA NIM. |
| F3 | Dynamically fetch and display **only free models** for the selected provider in a searchable dropdown. |
| F4 | Accept and securely handle a user-supplied API key per provider (BYOK — Bring Your Own Key). |
| F5 | Run a deterministic, ordered chain of 13 generation stages (see §8), each a separate LLM call with the previous stages' outputs fed in as context. |
| F6 | Stream each stage's output to the UI in real time. |
| F7 | Assemble each stage's output into a properly formatted, standalone `.md` file. |
| F8 | Merge all `.md` files into one styled, paginated PDF with a cover page, table of contents, and page numbers. |
| F9 | Offer a ZIP download of all `.md` files + the PDF. |
| F10 | Allow regenerating a single stage without rerunning the entire chain (reuses cached upstream context). |
| F11 | Persist project history (prompt, chosen model, generated files, timestamps) per user/session. |
| F12 | Allow editing the original prompt and re-running as a "v2" of the same project (versioned). |
| F13 | Show token/cost estimate and elapsed time per stage (cost will be $0 on free models, but token counts still matter for rate limits). |
| F14 | Gracefully handle rate-limit errors from free tiers with automatic retry/backoff and a clear "try another free model" fallback. |
| F15 | Let advanced users edit/override any of the 13 internal meta-prompts before running (a "Prompt Lab" power-user mode). |

---

## 4. Non-Functional Requirements

- **Zero server-side AI cost**: all inference is BYOK against free-tier endpoints; the app itself performs no paid inference.
- **Privacy-first**: API keys never touch persistent server storage in plaintext; prefer client-side storage or encrypted-at-rest with per-user keys if a backend vault is used.
- **Resilience**: any single stage failure must not corrupt the whole run; partial results are always downloadable.
- **Portability**: the three provider integrations sit behind one adapter interface so a fourth provider (e.g. Cerebras, Together AI) can be added later with minimal changes.
- **Performance**: use the fastest available free model tier (Groq's LPU inference in particular) for latency-sensitive stages like clarifying questions; use larger reasoning models for architecture/R&D stages.
- **Accessibility**: keyboard-navigable, screen-reader labeled form controls, WCAG AA color contrast.
- **Responsiveness**: works on mobile (single-column) and desktop (split-pane: chat/progress on left, file preview on right).

---

## 5. System Architecture

### 5.1 High-Level Diagram

```mermaid
flowchart TD
    U[User Browser] -->|prompt + provider + model + API key| FE[Frontend SPA]
    FE -->|REST/WebSocket| BE[Backend API Server]
    BE --> ORCH[Pipeline Orchestrator]
    ORCH --> ADAPT[Unified AI Provider Adapter]
    ADAPT -->|OpenAI-compatible calls| OR[OpenRouter API]
    ADAPT -->|OpenAI-compatible calls| GQ[Groq API]
    ADAPT -->|OpenAI-compatible calls| NV[NVIDIA NIM API]
    ORCH --> MDGEN[Markdown Assembler]
    MDGEN --> PDFGEN[PDF Renderer]
    MDGEN --> ZIP[Zip Packager]
    BE --> DB[(Database)]
    BE --> STORE[(File/Object Storage)]
    PDFGEN --> STORE
    MDGEN --> STORE
    STORE -->|signed URLs| FE
```

### 5.2 Component Breakdown

1. **Frontend SPA** — prompt input, provider/model selectors, clarifying-question form, live progress stream (via WebSocket or Server-Sent Events), Markdown preview, download center, project history.
2. **Backend API Server** — auth (optional), project CRUD, pipeline trigger endpoint, SSE/WebSocket streaming endpoint, key vault (session-scoped), rate-limit-aware queue.
3. **Pipeline Orchestrator** — the state machine that runs the 13 stages in order, passes context forward, retries on failure, allows single-stage re-run.
4. **Unified AI Provider Adapter** — one internal interface `generate({provider, model, apiKey, messages, stream})` that maps to each provider's OpenAI-compatible chat-completions endpoint (see §7).
5. **Markdown Assembler** — takes raw LLM text per stage, validates/cleans Markdown, adds YAML frontmatter (title, generated-at, stage, model used), writes to storage.
6. **PDF Renderer** — merges the ordered Markdown files into one document, applies a cover page + styled template + table of contents, and renders to PDF.
7. **Zip Packager** — bundles all `.md` files + PDF into one downloadable archive.
8. **Database** — stores users (optional), projects, stage outputs, generation metadata, model catalogs cache.
9. **File/Object Storage** — stores generated `.md` and `.pdf` artifacts (can be local disk for MVP, S3-compatible bucket for production).

---

## 6. Tech Stack

| Layer | Recommendation | Why |
|---|---|---|
| Frontend | **React + TypeScript + Vite**, TailwindCSS, shadcn/ui | Fast dev loop, component reuse, clean styling primitives |
| State/Data fetching | TanStack Query + Zustand | Simple async cache + light global state |
| Realtime | Server-Sent Events (SSE) for stage streaming (simpler than WebSockets for one-directional token streams) | Lower complexity, works through most proxies |
| Backend | **Node.js + TypeScript + Fastify** (or Express/NestJS) | Same language as frontend; first-class fetch/streaming support |
| Markdown rendering (preview) | `react-markdown` + `remark-gfm` | Renders tables, checklists, code fences |
| Markdown → PDF | `md-to-pdf` (Puppeteer-based) **or** Pandoc + `wkhtmltopdf`/WeasyPrint | Puppeteer route gives full CSS control for a polished cover page + ToC |
| Zip packaging | `archiver` (Node) | Streams a zip without buffering everything in memory |
| Database | **PostgreSQL** via Prisma ORM (SQLite for local/MVP) | Relational data (projects → stages → files) fits well |
| File storage | Local disk for MVP; **S3-compatible bucket** (AWS S3, Cloudflare R2, or Supabase Storage) for production | Durable, signed-URL downloads |
| Auth (optional, Phase 2) | Clerk / Auth.js / Supabase Auth | Only needed once history/multi-device sync matters |
| Queue (Phase 2, scale) | BullMQ + Redis | Needed once concurrent generation jobs are heavy |
| Deployment | Frontend: Vercel/Netlify. Backend: Fly.io / Render / Railway. DB: Neon/Supabase Postgres. | Cheap, fast to ship, scales later |

---

## 7. AI Provider Integration Layer

All three providers expose **OpenAI-compatible** `chat/completions` REST APIs, which is exactly why a single adapter works.

### 7.1 Unified Provider Interface

```ts
interface ProviderConfig {
  id: "openrouter" | "groq" | "nvidia_nim";
  baseUrl: string;
  apiKeyHeader: "Authorization";
  listModelsPath: string;      // GET path to list models
  chatCompletionsPath: string; // POST path for chat completions
}

interface GenerateParams {
  provider: ProviderConfig;
  apiKey: string;
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

async function generate(params: GenerateParams): AsyncIterable<string> {
  // POST to `${provider.baseUrl}${provider.chatCompletionsPath}`
  // headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
  // body: { model, messages, temperature, max_tokens: maxTokens, stream: true }
  // parse SSE `data: {...}` chunks -> yield delta.content
}
```

Every stage of the pipeline calls this **one function**, only swapping `provider`, `model`, and `messages`. This is the key architectural decision that keeps provider logic isolated and swappable.

### 7.2 OpenRouter Integration

- Base URL: `https://openrouter.ai/api/v1`
- Chat endpoint: `POST /chat/completions` (OpenAI-compatible)
- Model list endpoint: `GET /models` — returns full catalog with a `pricing` object per model (`{ prompt: "0", completion: "0" }` marks a free model). Free model IDs conventionally end in `:free`.
- Recommended UX shortcut: also surface **`openrouter/free`**, OpenRouter's own auto-router that randomly selects a capable free model per request — good as a one-click "just pick one for me" default in the dropdown.
- Required headers for good citizenship (optional but recommended by OpenRouter): `HTTP-Referer` and `X-Title` so usage shows up correctly on OpenRouter's leaderboards.
- Auth header: `Authorization: Bearer <OPENROUTER_API_KEY>`

**Free-model discovery logic (implement this, don't hardcode a list):**
```ts
const res = await fetch("https://openrouter.ai/api/v1/models");
const { data } = await res.json();
const freeModels = data.filter(
  (m) => m.pricing?.prompt === "0" && m.pricing?.completion === "0"
);
```

### 7.3 Groq Integration

- Base URL: `https://api.groq.com/openai/v1`
- Chat endpoint: `POST /chat/completions` (OpenAI-compatible, also supports `groq-sdk` official client)
- Model list endpoint: `GET /models` — Groq's free developer tier gives access to essentially the full hosted catalog (Llama, Qwen, DeepSeek-distilled, Gemma, Whisper for audio, etc.) at no dollar cost, gated purely by **rate limits** (requests/minute, requests/day, tokens/minute) rather than a separate "free vs paid" model split.
- Because there's no `pricing: 0` field the way OpenRouter has, treat **all models returned by Groq's `/models` endpoint as free-tier-eligible by default**, and surface Groq's documented per-model rate limits (fetched from their docs/console, or hardcode conservative defaults and let 429 responses drive the "try a different model" fallback).
- Auth header: `Authorization: Bearer <GROQ_API_KEY>`
- Groq's main selling point for this app: **extremely low latency** (LPU hardware) — use a Groq model as the default for short/fast stages like the clarifying-questions step.

### 7.4 NVIDIA NIM Integration

- Base URL: `https://integrate.api.nvidia.com/v1`
- Chat endpoint: `POST /chat/completions` (OpenAI-compatible)
- Model list endpoint: `GET /models` — NVIDIA's `build.nvidia.com` catalog hosts 80–100+ open-weight models (Llama, Nemotron family, Mistral, Qwen, DeepSeek, GLM, MiniMax, embedding models, etc.), free for prototyping under the NVIDIA Developer Program, gated by an account-level rate limit (documented around ~40 requests/minute at time of writing — confirm current value in the NVIDIA docs, since it changes).
- Some model families require an extra one-click "Request Access"/registration on their model page before your key can call them; if the adapter gets a 403, surface a clear message pointing the user to `build.nvidia.com` to enable that model family, and fall back to a general-purpose model.
- Auth header: `Authorization: Bearer <NVIDIA_API_KEY>`
- NVIDIA NIM is the best pick for **long-context / heavy reasoning stages** (R&D, architecture) since it hosts some of the largest free open-weight models.

### 7.5 Model Dropdown — Dynamic Fetch Logic

Do **not** hardcode a static model list anywhere in the product — all three catalogs change weekly. Instead:

1. Backend exposes `GET /api/providers/:provider/models`.
2. This endpoint calls the provider's live `/models` endpoint (using a short-lived cache, e.g. 15–60 minutes, stored in DB/Redis, to avoid hammering the provider).
3. For OpenRouter, filter server-side to `pricing.prompt === "0"`.
4. For Groq and NVIDIA NIM, return the full list (all free-tier) but tag known heavy/slow models so the UI can group them ("Fast", "Reasoning", "Long-context", "Coding").
5. Frontend dropdown groups by capability tag and shows context length + a "recommended for this stage" badge (e.g., recommend a fast model for clarifying questions, a large reasoning model for R&D/architecture).
6. Cache-busting "Refresh models" button lets the user force a re-fetch.

### 7.6 API Key Management & Security

- **Default mode (recommended): BYOK stored client-side only** (browser `localStorage`/`sessionStorage`, or an OS keychain if this becomes a desktop app). The key is sent to the backend only inside the request that triggers generation, used once, and never written to the database or logs.
- **Optional mode: server-side vault** for signed-in users who want convenience across devices — if implemented, encrypt keys at rest (e.g. AES-256-GCM with a server-held KMS key), scope decryption to the request path only, and never return the raw key to the frontend after initial save (mask as `sk-...abcd`).
- Always transmit keys over HTTPS only; never log full request/response bodies that contain the `Authorization` header.
- Rate-limit the backend's own `/generate` endpoint per session to prevent abuse of a user's pasted key by a compromised frontend session.
- Add a visible reminder in the UI: "Your key is used only to call the provider directly and is never stored on our servers" (adjust wording to match whichever mode is actually implemented).

---

## 8. The Generation Engine — 13-Stage Prompt Chain

This is the core IP of the product. Each stage is one LLM call. Every stage after Stage 1 receives: **(a)** the original user prompt, **(b)** the clarifying-question answers, and **(c)** a compact summary of all prior stage outputs (not the full text, to save context) so later documents stay consistent with earlier ones (e.g., the API spec must match the architecture doc's chosen stack).

**Orchestration rule:** run sequentially by default (each stage genuinely depends on the last); optionally allow stages 4–12 to run in parallel once Stage 3 (Architecture) is locked, since they mostly branch off the architecture decision rather than off each other — this cuts total wait time significantly. Provide an orchestrator flag `parallelAfterArchitecture: boolean`.

Below is the **system prompt** to use for every call (identical across stages) followed by the **stage-specific user prompt template**. `{{variable}}` denotes a runtime substitution.

### Shared System Prompt (used for all 13 stages)

```
You are a senior technical co-founder, product architect, and technical writer combined.
You produce professional, precise, implementation-ready documentation in clean GitHub-Flavored
Markdown. Rules:
- Never use vague filler ("robust", "scalable", "cutting-edge") without concrete specifics backing it up.
- Prefer concrete technology names, real file/folder names, real schema field names and types.
- Use tables, numbered lists, and code blocks where they aid precision.
- Stay internally consistent with any "PRIOR CONTEXT" given to you — do not contradict earlier
  architectural or tech-stack decisions unless explicitly asked to.
- Output ONLY the Markdown document body. No preamble, no "Here is your document", no closing remarks.
- Start the document with a single H1 title matching the section name.
```

### Stage 1 — Requirement Extraction & Clarification

**Purpose:** Turn a one-line idea into a structured brief, and generate the 3–5 clarifying questions shown to the user before the rest of the pipeline runs. Use a **fast** model here (Groq default).

```
USER PROMPT:
The user wants to build: "{{user_prompt}}"

Do two things:
1. Extract a structured one-paragraph restatement of the idea: target users, core problem solved,
   and the single most important feature.
2. Generate exactly 5 short clarifying questions (multiple-choice where possible, 2-4 options each)
   that would materially change the architecture or scope if answered differently. Cover: target
   platform (web/mobile/both/desktop), expected scale (hobby/startup MVP/enterprise), team size
   (solo/small team), timeline pressure (weekend hack/MVP in weeks/production-grade), and monetization
   (free/subscription/one-time/none).

Return valid JSON only, in this exact shape:
{
  "restated_idea": "...",
  "questions": [
    { "id": "platform", "question": "...", "options": ["Web", "Mobile", "Both", "Desktop"] },
    ...
  ]
}
```
*(This stage's output is JSON, not Markdown — it drives the UI form. All following stages produce Markdown.)*

### Stage 2 — Research & Discovery (R&D) Document → `01_research_and_discovery.md`

```
USER PROMPT:
PRIOR CONTEXT:
Idea: {{restated_idea}}
User answers: {{clarifying_answers_json}}

Write "01_research_and_discovery.md" — a Research & Discovery document covering:
1. Problem Statement — what pain point this solves and for whom.
2. Target Audience & Personas — 2-3 concrete user personas with goals and frustrations.
3. Market/Competitive Landscape — 3-5 comparable products or approaches, each with a one-line
   differentiation note for THIS project (do not fabricate real company data you are unsure of;
   speak in terms of product categories/approaches if specific competitors are uncertain).
4. Core Value Proposition — one sentence, plus 3 supporting bullet points.
5. Success Metrics — 4-6 measurable KPIs (e.g., activation rate, retention, task completion time).
6. Key Risks & Assumptions — assumptions being made and what would invalidate them.
7. Scope Boundaries — an explicit "In Scope" and "Out of Scope (v1)" list.
```

### Stage 3 — Architecture Document → `02_architecture.md`

```
USER PROMPT:
PRIOR CONTEXT: {{summary_of_stage_2}}

Write "02_architecture.md" — a System Architecture document covering:
1. Architecture Style — monolith / modular monolith / microservices / serverless, with a one-paragraph
   justification tied to the scale answer from clarifying questions.
2. High-Level Diagram — as a Mermaid `flowchart` code block showing all major components and data flow.
3. Component Responsibilities — a table: Component | Responsibility | Key Technology.
4. Data Flow — a numbered walkthrough of what happens on the product's single most important user action,
   end to end (client -> API -> service -> DB -> response).
5. Third-Party Integrations — list any needed external APIs/services and why.
6. Scalability & Bottleneck Notes — the first thing likely to break at 10x usage, and the fix.
7. Non-Functional Requirements — security, availability, latency targets appropriate to this project's scale.
```

### Stage 4 — Tech Stack & Tooling → `03_tech_stack.md`

```
USER PROMPT:
PRIOR CONTEXT: {{summary_of_stage_3}}

Write "03_tech_stack.md" listing, as tables, the exact recommended technology per layer:
Frontend framework, styling, state management, backend framework/language, database, ORM,
authentication, file/object storage, caching, background jobs/queue, testing frameworks,
CI/CD, hosting/deployment target, and monitoring/logging. For each row include: Technology,
Version/Notes, Why chosen (one line), and one credible Alternative. End with a section
"Local Dev Setup" giving the exact CLI commands to scaffold the chosen stack from zero.
```

### Stage 5 — Database Schema → `04_database_schema.md`

```
USER PROMPT:
PRIOR CONTEXT: {{summary_of_stage_3}} {{summary_of_stage_4}}

Write "04_database_schema.md":
1. An Entity-Relationship overview as a Mermaid `erDiagram`.
2. For every entity: a Markdown table of fields (name, type, constraints, notes).
3. Key relationships and cascade rules (on delete/update behavior).
4. Indexing recommendations for the top 3 expected query patterns.
5. A ready-to-run schema in the ORM/language chosen in the tech stack doc (e.g. a Prisma schema
   block, or SQL DDL) inside a fenced code block.
```

### Stage 6 — API Specification → `05_api_specification.md`

```
USER PROMPT:
PRIOR CONTEXT: {{summary_of_stage_3}} {{summary_of_stage_5}}

Write "05_api_specification.md": a REST API spec covering every endpoint needed for the MVP.
For each endpoint, a subsection with: Method + Path, Auth required (yes/no), Request body/
query params (table: field, type, required, notes), Success response shape (JSON example),
Error responses (status code + meaning). Group endpoints by resource. End with an
Authentication & Authorization section explaining the auth strategy end to end.
```

### Stage 7 — Workflow & User Flows → `06_workflow_and_user_flows.md`

```
USER PROMPT:
PRIOR CONTEXT: {{summary_of_stage_2}} {{summary_of_stage_3}}

Write "06_workflow_and_user_flows.md":
1. Primary User Flow — numbered step-by-step for the single core action, written as a user
   story sequence, plus the same flow as a Mermaid `sequenceDiagram` (user, frontend, backend, DB).
2. Secondary Flows — onboarding/signup, error/edge-case handling, and (if relevant) admin/back-office flow.
3. State Diagram — for the core entity's lifecycle (e.g. order: created -> paid -> shipped -> delivered)
   as a Mermaid `stateDiagram-v2`.
4. Team Workflow (if team size > solo) — branching strategy, PR review process, environment
   promotion (dev -> staging -> prod).
```

### Stage 8 — Folder & File Structure → `07_folder_structure.md`

```
USER PROMPT:
PRIOR CONTEXT: {{summary_of_stage_4}}

Write "07_folder_structure.md": the exact recommended repository folder/file tree (as a fenced
text code block using tree-style indentation) for the chosen stack, down to the level of key
files (not every file, but every meaningful folder and the 1-2 most important files inside it).
Follow it with a short table explaining the purpose of each top-level folder.
```

### Stage 9 — Development Roadmap & Milestones → `08_roadmap.md`

```
USER PROMPT:
PRIOR CONTEXT: {{summary_of_stage_2}} {{summary_of_stage_3}} {{clarifying_answers_json}}

Write "08_roadmap.md": break the build into phases sized to the stated timeline pressure
and team size. For each phase: Phase name, Goal, Task checklist (as Markdown checkboxes),
Estimated duration, and "Definition of Done". Include an explicit "Phase 0: Setup" and a final
"Launch Checklist" phase. Present a summary Gantt-style Mermaid `gantt` chart at the top.
```

### Stage 10 — Testing & QA Plan → `09_testing_plan.md`

```
USER PROMPT:
PRIOR CONTEXT: {{summary_of_stage_3}} {{summary_of_stage_6}}

Write "09_testing_plan.md": testing strategy across unit, integration, end-to-end, and
manual QA layers. For each layer: what gets tested, tooling/framework, and 3-5 concrete
example test cases relevant to this specific project's core feature (not generic examples).
Include a section on performance/load testing thresholds and a pre-launch QA checklist.
```

### Stage 11 — Deployment & DevOps Plan → `10_deployment_plan.md`

```
USER PROMPT:
PRIOR CONTEXT: {{summary_of_stage_4}} {{summary_of_stage_9}}

Write "10_deployment_plan.md": environments (local/staging/prod), CI/CD pipeline steps
(as a numbered list matching the chosen CI tool), required environment variables (table:
name, purpose, example value — no real secrets), rollback strategy, and monitoring/alerting
setup (what to monitor, which tool, what threshold triggers an alert).
```

### Stage 12 — Risk Register → `11_risk_register.md`

```
USER PROMPT:
PRIOR CONTEXT: everything above, summarized.

Write "11_risk_register.md" as a table: Risk, Category (technical/market/legal/operational),
Likelihood (Low/Med/High), Impact (Low/Med/High), Mitigation. Include at least 8 risks spanning
all categories, specific to this project (not generic "the market might not want it" filler
without a concrete mitigation attached).
```

### Stage 13 — Master README / Executive Summary → `00_README.md`

```
USER PROMPT:
PRIOR CONTEXT: one-paragraph summary of each of the 11 documents produced above.

Write "00_README.md": the front-page executive summary for this entire planning package.
Include: Project name (invent a fitting one if not given), one-paragraph pitch, a table of
contents linking to every generated file by filename, "How to use this package" instructions
for a developer picking it up cold, and a "Quick Start" 5-step summary of the fastest path
from zero to a working v1.
```

---

## 9. Output File Structure

```
project-blueprint-{{slug}}/
├── 00_README.md
├── 01_research_and_discovery.md
├── 02_architecture.md
├── 03_tech_stack.md
├── 04_database_schema.md
├── 05_api_specification.md
├── 06_workflow_and_user_flows.md
├── 07_folder_structure.md
├── 08_roadmap.md
├── 09_testing_plan.md
├── 10_deployment_plan.md
├── 11_risk_register.md
└── project-blueprint-{{slug}}.pdf   (all of the above merged, styled, with a cover page + ToC)
```

Every `.md` file gets YAML frontmatter for traceability:

```yaml
---
title: "Architecture"
project: "{{project_name}}"
generated_at: "{{iso_timestamp}}"
provider: "{{provider_id}}"
model: "{{model_id}}"
stage: 3
---
```

---

## 10. PDF Generation Pipeline

1. Read all `.md` files in numeric filename order.
2. Strip YAML frontmatter, render each Markdown body to HTML (via `markdown-it` or `remark` + `remark-html`, with `remark-gfm` for tables and Mermaid diagram support via a Mermaid-to-SVG pre-render step, since PDF renderers can't execute JS diagrams live).
3. Wrap the concatenated HTML in one print-ready template: cover page (project name, generated date, provider/model used), auto-generated table of contents with page-number anchors, consistent header/footer with page numbers, and a clean typographic style (system font stack, code blocks with a light background, tables with borders).
4. Render to PDF with **Puppeteer** (`page.pdf({ format: 'A4', printBackground: true })`) for full CSS control — this is the most reliable path for consistent typography and Mermaid-diagram images. Pandoc + LaTeX is a solid alternative if the team prefers a non-Node toolchain.
5. Save the PDF to object storage alongside the `.md` files; return a signed download URL.

---

## 11. Database Schema (the app's own backend DB)

```prisma
model User {
  id        String    @id @default(cuid())
  email     String?   @unique
  createdAt DateTime  @default(now())
  projects  Project[]
}

model Project {
  id           String   @id @default(cuid())
  userId       String?
  user         User?    @relation(fields: [userId], references: [id])
  title        String
  originalPrompt String
  clarifyingAnswers Json
  provider     String   // "openrouter" | "groq" | "nvidia_nim"
  model        String
  status       String   // "pending" | "running" | "completed" | "failed" | "partial"
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  stages       Stage[]
  pdfUrl       String?
  zipUrl       String?
}

model Stage {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  stageNumber Int
  name        String
  filename    String
  contentMd   String   @db.Text
  status      String   // "pending" | "running" | "completed" | "failed"
  tokensUsed  Int?
  durationMs  Int?
  createdAt   DateTime @default(now())
}

model ModelCatalogCache {
  id         String   @id @default(cuid())
  provider   String
  modelsJson Json
  fetchedAt  DateTime @default(now())
}
```

---

## 12. REST API Endpoint Spec (the app's own backend)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/providers` | List supported providers with metadata (name, base URL, docs link). |
| GET | `/api/providers/:provider/models` | Live (cached) free-model list for a provider. |
| POST | `/api/projects` | Create a project: `{ prompt, provider, model, apiKey }` → runs Stage 1, returns clarifying questions + `projectId`. |
| POST | `/api/projects/:id/answers` | Submit clarifying-question answers, triggers the full 13-stage pipeline. |
| GET | `/api/projects/:id/stream` | SSE stream of stage progress + token deltas. |
| GET | `/api/projects/:id` | Fetch full project state, all stage outputs, download URLs. |
| POST | `/api/projects/:id/stages/:n/regenerate` | Re-run a single stage with an optional user-edited meta-prompt. |
| GET | `/api/projects/:id/download/zip` | Signed URL / stream for the zip bundle. |
| GET | `/api/projects/:id/download/pdf` | Signed URL / stream for the merged PDF. |
| GET | `/api/projects` | List a user's project history. |
| DELETE | `/api/projects/:id` | Delete a project and its stored artifacts. |

---

## 13. Frontend UI/UX Spec

**Pages / Views:**

1. **Home / New Project** — hero input box ("What do you want to build?"), provider tabs (OpenRouter / Groq / NVIDIA NIM), model dropdown (grouped: Fast / Reasoning / Long-context / Coding), API key field (with a "How do I get a free key?" link per provider), "Generate Blueprint" CTA.
2. **Clarify** — the 5 generated questions as chips/radio groups, with a "Use smart defaults" skip option.
3. **Generating** — split view: left = vertical stepper of the 13 stages with live status (queued/running/done/failed) and streamed text preview; right = live-rendered Markdown of the stage currently running.
4. **Results** — file-tree sidebar of all generated `.md` files, main pane renders the selected file with GFM styling (tables, code blocks, Mermaid diagrams rendered client-side), top bar with "Download ZIP", "Download PDF", "Regenerate this section", "Edit prompt & re-run (v2)".
5. **History** — card grid of past projects (title, date, provider/model badge, status), click to reopen Results view.
6. **Prompt Lab (advanced/optional)** — lets a power user view and edit any of the 13 stage meta-prompts before running, with a "reset to default" button per stage.

**Component list:** `PromptInput`, `ProviderTabs`, `ModelDropdown`, `ApiKeyInput`, `ClarifyingQuestionForm`, `PipelineStepper`, `StreamingMarkdownViewer`, `FileTreeSidebar`, `MarkdownRenderer` (with Mermaid support), `DownloadBar`, `ProjectHistoryCard`, `PromptLabEditor`.

---

## 14. Folder Structure of the Codebase

```
blueprintai/
├── apps/
│   ├── web/                      # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── lib/api-client.ts
│   │   │   └── main.tsx
│   │   └── index.html
│   └── server/                   # Fastify backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── providers.ts
│       │   │   └── projects.ts
│       │   ├── adapters/
│       │   │   ├── openrouter.ts
│       │   │   ├── groq.ts
│       │   │   ├── nvidiaNim.ts
│       │   │   └── unifiedAdapter.ts
│       │   ├── pipeline/
│       │   │   ├── orchestrator.ts
│       │   │   ├── prompts/           # the 13 meta-prompt templates
│       │   │   └── stages/
│       │   ├── generators/
│       │   │   ├── markdownAssembler.ts
│       │   │   ├── pdfRenderer.ts
│       │   │   └── zipPackager.ts
│       │   ├── db/
│       │   │   ├── schema.prisma
│       │   │   └── client.ts
│       │   └── server.ts
│       └── package.json
├── packages/
│   └── shared-types/              # shared TS types between web & server
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 15. Development Roadmap (for building BluePrintAI itself)

**Phase 0 — Setup (1–2 days):** repo scaffold, Prisma + Postgres/SQLite, env config, CI skeleton.

**Phase 1 — Provider Adapter Layer (2–3 days):** implement unified adapter, `/models` endpoints for all 3 providers with free-tier filtering/caching, manual test of a raw chat completion against each provider.

**Phase 2 — Pipeline Core (3–5 days):** implement Stage 1 (JSON clarifying questions) end to end; implement orchestrator that can run stages 2–13 sequentially with context-passing; SSE streaming to a bare-bones frontend.

**Phase 3 — Frontend MVP (4–6 days):** Home, Clarify, Generating, Results pages wired to the pipeline; Markdown rendering with Mermaid support.

**Phase 4 — File Output (2–3 days):** Markdown assembler with frontmatter, PDF renderer (Puppeteer), zip packager, signed download URLs.

**Phase 5 — Polish (3–4 days):** regenerate-single-stage, project history, error/rate-limit handling with fallback model suggestions, responsive/mobile layout, accessibility pass.

**Phase 6 — Launch Checklist:** env vars finalized, rate limiting on `/api/projects`, basic analytics (which provider/model gets used most), landing-page copy, deploy frontend + backend + DB.

---

## 16. Testing Plan

- **Unit:** each provider adapter (mock HTTP responses), Markdown assembler (frontmatter correctness), PDF renderer (snapshot test of generated HTML before Puppeteer render).
- **Integration:** full pipeline run against a mocked LLM that returns canned Markdown per stage — assert all 12 files + 1 PDF are produced with correct filenames and internal consistency (e.g., tech stack mentioned in Stage 4 also appears in Stage 5 schema).
- **E2E:** Playwright test: enter a prompt → answer clarifying questions → wait for completion → download zip → assert zip contains 13 files.
- **Manual QA before each release:** run one full generation against each of the 3 providers with a real free API key and read the output for coherence.

---

## 17. Deployment Plan

- **Frontend:** Vercel (auto-deploy from `main`, preview deploys per PR).
- **Backend:** Render or Fly.io (Dockerized Fastify app).
- **Database:** Neon or Supabase Postgres (managed, generous free tier).
- **File storage:** Cloudflare R2 or Supabase Storage (S3-compatible, cheap egress).
- **Env vars:** none of the three AI provider keys are server-side secrets in BYOK mode — the only server secrets are DB connection string, storage bucket credentials, and (if used) a KMS key for optional key-vault mode.
- **Monitoring:** simple uptime check (e.g. Better Uptime) + server logs shipped to a log drain (e.g. Axiom/Logtail); track pipeline failure rate per provider as the key health metric.

---

## 18. Security & Privacy Considerations

- Treat every pasted API key as sensitive: HTTPS only, never logged, never stored server-side unless the user explicitly opts into the vault feature.
- Sanitize all LLM output before rendering as HTML/PDF (Markdown renderer should escape raw HTML by default) to prevent stored-XSS from a manipulated or adversarial model response.
- Rate-limit `/api/projects` per IP/session to stop the tool being used to hammer a pasted key on someone's behalf.
- Add a clear ToS note: the user is responsible for complying with each provider's own acceptable-use policy for their free tier.
- Do not proxy or cache the actual generated content in a way that's accessible to other users — scope all storage reads by project ownership/session token.

---

## 19. Future Enhancements

- Add more providers behind the same adapter (Cerebras, Together AI, Google AI Studio free tier).
- Let users export directly to Notion/Google Docs/GitHub repo (auto-create a repo with the folder structure from Stage 8 pre-scaffolded).
- Team collaboration: shared projects, comments per section.
- "Turn this blueprint into a Claude Code / Cursor task list" one-click export that reformats Stage 9 (Roadmap) into an agent-ready task file.
- Model quality feedback loop: let users thumbs-up/down each stage's output per model to build a "best free model per stage" leaderboard inside the app.

---

## 20. Appendix — Example `.env`

```bash
# Server
PORT=4000
DATABASE_URL=postgresql://user:pass@localhost:5432/blueprintai

# Storage
STORAGE_BUCKET=blueprintai-files
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

# Optional: only if server-side key vault mode is enabled
KEY_VAULT_ENCRYPTION_KEY=

# Provider base URLs (safe to hardcode as constants, not secrets)
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
GROQ_BASE_URL=https://api.groq.com/openai/v1
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
```

**Note on free-model lists:** deliberately avoid hardcoding specific model IDs anywhere in the product beyond example/placeholder text in docs like this one — all three providers add, remove, and rename free models frequently (weekly in some cases). The dynamic `/models` fetch in §7.5 is the only reliable source of truth; treat any model list in this document as illustrative, not authoritative.
