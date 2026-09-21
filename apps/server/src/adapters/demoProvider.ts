import { AIModel } from '@archly/shared-types';

export function getDemoModels(): AIModel[] {
  return [
    {
      id: 'demo-blueprint-engine-v1',
      name: 'Archly Engine (Instant Sandbox Mode)',
      provider: 'demo',
      contextLength: 128000,
      tags: ['Fast', 'Recommended', 'Reasoning'],
      isFree: true,
      description: 'Zero-configuration test engine simulating full 14-stage output stream with realistic blueprints.',
      pricing: { prompt: 0, completion: 0 },
    },
  ];
}

export function generateDemoContent(stageNumber: number, prompt: string, priorContext: Record<string, string>): string {
  const idea = prompt || 'Modern AI Powered Application';
  const cleanTitle = idea.slice(0, 50).trim();

  switch (stageNumber) {
    case 1: {
      return JSON.stringify({
        restated_idea: `A high-performance system designed to deliver "${idea}". The application addresses fragmented user experiences by providing intelligent, automated workflows and intuitive cross-platform access.`,
        questions: [
          {
            id: 'platform',
            question: 'What is the primary target platform for the initial release?',
            options: ['Web Application (Responsive)', 'Mobile (iOS & Android)', 'Cross-Platform (Web + Mobile)', 'Desktop (Tauri / Native)']
          },
          {
            id: 'scale',
            question: 'What is the anticipated initial user scale and velocity?',
            options: ['Hobby / Prototype (<500 users)', 'Startup MVP (1k - 20k users)', 'High-Growth Scale (50k - 500k users)', 'Enterprise Multi-Tenant']
          },
          {
            id: 'team',
            question: 'What is the composition of the development team?',
            options: ['Solo Developer', 'Small Core Team (2-4 engineers)', 'Growing Team (5-10 engineers)', 'Open Source Community']
          },
          {
            id: 'timeline',
            question: 'What is your target timeline for the initial launch?',
            options: ['Weekend Sprint (48 Hours)', 'Rapid MVP (2-4 Weeks)', 'Standard Product Cycle (2-3 Months)', 'Production Hardened (6 Months)']
          },
          {
            id: 'monetization',
            question: 'What is the planned revenue and monetization model?',
            options: ['Freemium + Paid Tiers (Stripe)', 'Usage-Based Metered Billing', '100% Free & Open Source', 'B2B Enterprise Licensing']
          }
        ]
      }, null, 2);
    }

    case 2:
      return `# Research & Discovery (R&D) Document

## 1. Problem Statement
Modern users looking to accomplish "${idea}" currently face fragmented tooling, high cognitive overhead, and excessive manual overhead. Existing solutions either cater strictly to enterprise workflows or lack developer-friendly automation.

## 2. Target Audience & Personas

### Persona A: The Pragmatic Builder (Alex, 29)
- **Role:** Technical Lead / Solo Founder.
- **Goals:** Ship reliable software quickly without managing complex DevOps infrastructure.
- **Frustrations:** Tedious boilerplate setup, incomplete documentation, and disjointed APIs.

### Persona B: The Product Operator (Sarah, 34)
- **Role:** Product Manager / Operations Lead.
- **Goals:** Standardize workflows, track milestones, and ensure consistent project deliverables.
- **Frustrations:** Vendor lock-in, opaque pricing models, and lack of transparency.

## 3. Market & Competitive Landscape
| Competitor / Approach | Strengths | Limitations | Our Key Differentiator |
|---|---|---|---|
| Incumbent SaaS Tools | Mature ecosystems | Expensive, rigid workflows | Lightweight, instant setup with zero lock-in |
| Generic AI Chatbots | Flexible open prompts | Unstructured, hallucinatory specs | Deterministic 14-stage pipeline with validated schemas |
| Traditional Agencies | High human touch | Months of turnaround, high cost | Automated turn-key delivery in under 90 seconds |

## 4. Core Value Proposition
**Deliver an implementation-ready blueprint for "${idea}" with zero configuration and total data sovereignty.**
- Automated domain-specific architectural modeling.
- Clear separation of concerns from data layer to frontend rendering.
- Deterministic milestones aligned directly with developer execution velocity.

## 5. Success Metrics & KPIs
- **Activation Rate:** > 65% of landing page visitors trigger blueprint generation.
- **Spec Completion Time:** Complete end-to-end package synthesized in < 120 seconds.
- **Developer Utility Score:** 90%+ positive rating on exported API and database specifications.
- **Zero-Crash Rate:** > 99.8% uptime across all API adapter endpoints.

## 6. Key Risks & Assumptions
- *Assumption:* Users prefer bring-your-own-key (BYOK) model over subscription credits. *Validation:* Survey indicates 78% of developer founders already hold active AI API keys.
- *Risk:* Upstream provider rate limits on free tiers. *Mitigation:* Automatic failover and retry mechanisms.

## 7. Scope Boundaries
- **In Scope (v1 MVP):** Unified provider abstraction, interactive clarifying questionnaire, 14-stage document orchestration, in-browser GFM preview, ZIP and PDF export.
- **Out of Scope (v1):** Real-time collaborative team multi-editing, automated cloud deployment provisioning, billing gateway.
`;

    case 3:
      return `# System Architecture

## 1. Architecture Style
A **Modular Monolith** architecture is selected for this project. Given the target scale and team dynamics, a modular monolith ensures rapid feature velocity, single-command deployment, zero distributed network latency, and strict type boundaries across domains while remaining straightforward to decompose into microservices at 10x scale.

## 2. High-Level Diagram

\`\`\`mermaid
flowchart TD
    Client["Web Browser SPA / Mobile Client"] -->|"HTTPS REST & SSE"| Gateway["API Gateway / Router"]
    Gateway --> Auth["Auth & Rate Limit Guard"]
    Auth --> Orchestrator["Pipeline Orchestrator"]
    Orchestrator --> Adapter["Unified Provider Adapter"]
    Adapter --> OpenRouter["OpenRouter Cloud"]
    Adapter --> Groq["Groq LPU Cloud"]
    Adapter --> Nvidia["NVIDIA NIM Cloud"]
    Orchestrator --> Assembler["Markdown & Artifact Engine"]
    Assembler --> PDF["PDF & Zip Exporter"]
    Orchestrator --> DB[("SQLite / PostgreSQL DB")]
\`\`\`

## 3. Component Responsibilities
| Component | Responsibility | Key Technology |
|---|---|---|
| Frontend Client | Responsive UI, state management, streaming token rendering, Mermaid visuals | React, Vite, TailwindCSS |
| API Layer | Route handling, request validation, SSE connection lifecycle | Node.js, Express / Fastify |
| Unified Adapter | Standardizes payload schemas and error handling across heterogeneous AI providers | TypeScript, Fetch API |
| Pipeline Orchestrator | Stage sequencing, cumulative context summarization, retries | State machine pattern |
| Storage Engine | Artifact persistence, SQLite relational metadata, ZIP bundling | Prisma ORM, Archiver |

## 4. Data Flow Walkthrough
1. **User Initiation:** User inputs project brief and submits via the web UI.
2. **Clarification Stage:** API invokes Stage 1 to extract intent and produce 5 structured questions.
3. **Execution Trigger:** User validates options; client subscribes to SSE channel at \`/api/projects/:id/stream\`.
4. **Context Loop:** Each completed stage stores raw Markdown in SQLite and emits sanitized summaries downstream.
5. **Final Assembly:** Markdown assembler attaches YAML metadata; PDF compiler builds table of contents and merged package.

## 5. Third-Party Integrations
- **AI Inference Providers:** OpenRouter, Groq Cloud, NVIDIA NIM for free-tier LLM inference.
- **Font & Icon CDN:** Google Fonts (Inter, JetBrains Mono) and Lucide icons.

## 6. Scalability & Bottleneck Analysis
- **Primary Bottleneck:** Concurrent streaming connections consuming Node.js event loop resources.
- **Remediation:** Offload SSE pub/sub to Redis or an event-driven worker pool (e.g. BullMQ) when concurrent executions exceed 1,000 active streams.

## 7. Non-Functional Requirements
- **P95 Latency:** < 250ms for REST endpoints; continuous SSE stream with < 50ms chunk interval.
- **Security:** Zero persistent plaintext storage of user BYOK credentials.
- **Accessibility:** WCAG AA compliant contrast and full keyboard navigation.
`;

    case 4:
      return `# Tech Stack & Tooling

## 1. Core Technology Matrix
| Layer | Technology | Version / Notes | Why Chosen | Credible Alternative |
|---|---|---|---|---|
| **Frontend Framework** | React + Vite | React 18 / Vite 5 | Instant HMR, massive ecosystem, ultra-lean build output | Next.js 14 |
| **Styling** | Tailwind CSS | v3.4 | Utility-first, predictable design tokens, zero runtime CSS overhead | Vanilla CSS Modules |
| **State Management** | React Hooks & State | Built-in | Zero extra bundle size, sufficient for local pipeline workflows | Zustand |
| **Backend Framework** | Node.js + Express | Node 20+, Express 4 | Proven stability, native SSE streaming support, rich ecosystem | Fastify |
| **Database & ORM** | SQLite + Prisma | Prisma 5 | Zero setup database for local dev, instant migrations, type-safety | PostgreSQL + Drizzle |
| **Document Packaging** | Archiver & PDFKit | Archiver 7, PDFKit 0.15 | Direct vector PDF rendering without external headless browser crashes | Puppeteer / Pandoc |
| **Diagram Engine** | Mermaid.js | v10.9 | Client-side reactive rendering of sequence, erDiagram, and flowcharts | PlantUML |
| **Icons & Typography** | Lucide React + Inter | Latest | Clean, modern developer-focused aesthetic | Feather Icons |

## 2. Local Dev Setup
Execute the following commands in your shell to bootstrap the development environment:

\`\`\`bash
# 1. Clone repository and install dependencies
git clone https://github.com/example/blueprint-project.git
cd blueprint-project
npm install

# 2. Configure environment variables
cp .env.example .env

# 3. Synchronize database schema
npm run prisma:push

# 4. Start concurrent development servers (Web on :3000, API on :4000)
npm run dev
\`\`\`
`;

    case 5:
      return `# Database Schema

## 1. Entity-Relationship Diagram

\`\`\`mermaid
erDiagram
    PROJECT ||--o{ STAGE : contains
    PROJECT {
        string id PK
        string title
        string originalPrompt
        string restatedIdea
        string clarifyingAnswers
        string provider
        string model
        string status
        string pdfUrl
        string zipUrl
        datetime createdAt
        datetime updatedAt
    }
    STAGE {
        string id PK
        string projectId FK
        int stageNumber
        string name
        string filename
        string contentMd
        string status
        int tokensUsed
        int durationMs
        datetime createdAt
    }
    MODEL_CATALOG_CACHE {
        string id PK
        string provider
        string modelsJson
        datetime fetchedAt
    }
\`\`\`

## 2. Table Field Specifications

### Table: \`Project\`
| Field | Type | Constraints | Description |
|---|---|---|---|
| \`id\` | String | Primary Key, CUID | Unique identifier for the blueprint project |
| \`title\` | String | NOT NULL | Human-readable title inferred from prompt |
| \`originalPrompt\` | Text | NOT NULL | User's initial raw input |
| \`restatedIdea\` | Text | NULLABLE | Refined and structured core concept |
| \`clarifyingAnswers\`| Text / JSON | DEFAULT '{}' | Answers to the 5 clarifying questions |
| \`provider\` | String | NOT NULL | 'openrouter', 'groq', 'nvidia_nim', or 'demo' |
| \`model\` | String | NOT NULL | Identifier of the selected LLM model |
| \`status\` | String | NOT NULL | 'pending', 'running', 'completed', 'failed' |

### Table: \`Stage\`
| Field | Type | Constraints | Description |
|---|---|---|---|
| \`id\` | String | Primary Key, CUID | Unique identifier for stage execution |
| \`projectId\` | String | Foreign Key | References \`Project(id)\` ON DELETE CASCADE |
| \`stageNumber\` | Integer | NOT NULL | Stage index (1 through 14) |
| \`name\` | String | NOT NULL | Descriptive stage name |
| \`filename\` | String | NOT NULL | Artifact filename (e.g. \`02_architecture.md\`) |
| \`contentMd\` | Text | NOT NULL | Generated Markdown output body |
| \`status\` | String | NOT NULL | Execution status |

## 3. Production Prisma Schema
\`\`\`prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Project {
  id               String   @id @default(cuid())
  title            String
  originalPrompt   String
  restatedIdea     String?
  clarifyingAnswers String  @default("{}")
  provider         String
  model            String
  status           String   @default("pending")
  pdfUrl           String?
  zipUrl           String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  stages           Stage[]
}

model Stage {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  stageNumber Int
  name        String
  filename    String
  contentMd   String
  status      String
  tokensUsed  Int?
  durationMs  Int?
  createdAt   DateTime @default(now())
}
\`\`\`
`;

    case 6:
      return `# API Specification

## 1. Overview
The backend exposes an idiomatic RESTful API paired with a dedicated Server-Sent Events (SSE) stream for real-time progress updates.

## 2. Endpoints

### 2.1 Provider Discovery
\`\`\`http
GET /api/providers
\`\`\`
- **Description:** Returns the catalog of supported AI providers.
- **Response (200 OK):**
\`\`\`json
[
  { "id": "openrouter", "name": "OpenRouter", "docsUrl": "https://openrouter.ai" },
  { "id": "groq", "name": "Groq Cloud", "docsUrl": "https://console.groq.com" },
  { "id": "nvidia_nim", "name": "NVIDIA NIM", "docsUrl": "https://build.nvidia.com" },
  { "id": "demo", "name": "Demo Mode", "docsUrl": "#" }
]
\`\`\`

### 2.2 Model Catalog
\`\`\`http
GET /api/providers/:provider/models
\`\`\`
- **Description:** Returns the cached free-tier models for the requested provider.
- **Response (200 OK):**
\`\`\`json
[
  {
    "id": "llama-3.3-70b-versatile",
    "name": "Groq: Llama 3.3 70B Versatile",
    "provider": "groq",
    "contextLength": 128000,
    "tags": ["Recommended", "Reasoning"],
    "isFree": true
  }
]
\`\`\`

### 2.3 Create Project & Clarifications (Stage 1)
\`\`\`http
POST /api/projects
Content-Type: application/json

{
  "prompt": "Build an automated expense tracker with receipt scanning",
  "provider": "groq",
  "model": "llama-3.3-70b-versatile",
  "apiKey": "gsk_optional_byok_key"
}
\`\`\`
- **Response (201 Created):**
\`\`\`json
{
  "projectId": "clw9x0001",
  "restatedIdea": "A receipt-parsing personal finance assistant...",
  "questions": [
    { "id": "platform", "question": "Target platform?", "options": ["Web", "Mobile"] }
  ]
}
\`\`\`

### 2.4 Submit Answers & Trigger Pipeline
\`\`\`http
POST /api/projects/:id/answers
Content-Type: application/json

{
  "answers": { "platform": "Web", "scale": "Startup MVP" },
  "apiKey": "gsk_optional_byok_key"
}
\`\`\`
- **Response (200 OK):**
\`\`\`json
{ "status": "running", "projectId": "clw9x0001" }
\`\`\`

### 2.5 Realtime Progress Stream
\`\`\`http
GET /api/projects/:id/stream
Accept: text/event-stream
\`\`\`
- **Event Types:** \`stage_start\`, \`token_delta\`, \`stage_complete\`, \`pipeline_complete\`, \`error\`.

### 2.6 Download Artifacts
- \`GET /api/projects/:id/download/zip\` — Returns streaming binary \`.zip\` bundle.
- \`GET /api/projects/:id/download/pdf\` — Returns merged, styled \`.pdf\` document.
`;

    case 7:
      return `# Workflow & User Flows

## 1. Primary User Journey

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as "Web Client (Vite)"
    participant API as "API Server (Node)"
    participant Model as "AI Model (BYOK)"
    participant DB as "SQLite DB"

    User->>Web: Enters Project Idea and Selects Model
    Web->>API: POST /api/projects
    API->>Model: Execute Stage 1 (Clarifications)
    Model-->>API: Returns 5 Questions (JSON)
    API-->>Web: Questions displayed to User
    User->>Web: Selects Options and Clicks Generate Blueprint
    Web->>API: POST /api/projects/:id/answers
    Web->>API: GET /api/projects/:id/stream (SSE)
    loop Stages 2 through 14
        API->>Model: Run Stage Prompt with Cumulative Context
        Model-->>API: Stream token chunks
        API-->>Web: SSE token_delta and stage_complete
        API->>DB: Save Stage Markdown Record
    end
    API-->>Web: SSE pipeline_complete
    User->>Web: Downloads ZIP and PDF Artifacts
\`\`\`

## 2. Project Lifecycle State Diagram

\`\`\`mermaid
stateDiagram-v2
    [*] --> Draft: User inputs idea
    Draft --> Clarifying: Stage 1 Questions generated
    Clarifying --> Executing: User answers submitted
    Executing --> Completed: All artifacts packaged
    Executing --> Failed: Upstream API or Network error
    Completed --> [*]
    Failed --> Executing: User retries single stage
\`\`\`

## 3. Team & Development Workflow
- **Branching Model:** Trunk-based development with short-lived feature branches (\`feat/stage-engine\`, \`fix/sse-reconnect\`).
- **Continuous Integration:** GitHub Actions executes linting, type-checking, and integration tests on pull requests.
- **Deployment Cadence:** Automated deployment to staging on merge to \`main\`.
`;

    case 8:
      return `# UI & UX Design Specification

## 1. Design System & Visual Foundations

### Brand & Visual Identity
The visual identity of "${cleanTitle}" follows an engineered, high-precision aesthetic designed for speed, clarity, and reduced cognitive fatigue.

### Color Palette Tokens (Dark & Light Theme)
| Token Name | Light Mode (Hex) | Dark Mode (Hex) | Usage / Intent | WCAG Contrast |
|---|---|---|---|---|
| \`--bg-canvas\` | \`#F8FAFC\` | \`#0B0F17\` | Root application background | Baseline |
| \`--bg-panel\` | \`#FFFFFF\` | \`#131B2A\` | Cards, sidebars, modals | 14.2:1 (AAA) |
| \`--bg-input\` | \`#F1F5F9\` | \`#1E293B\` | Form fields, active surfaces | 11.5:1 (AAA) |
| \`--text-primary\` | \`#0F172A\` | \`#F8FAFC\` | Primary headings & high-emphasis text | 15.8:1 (AAA) |
| \`--text-secondary\` | \`#475569\` | \`#94A3B8\` | Secondary labels, descriptions, metadata | 7.1:1 (AAA) |
| \`--text-muted\` | \`#94A3B8\` | \`#64748B\` | Placeholders, disabled states | 4.6:1 (AA) |
| \`--accent-primary\` | \`#6366F1\` | \`#818CF8\` | Primary actions, key focus rings, highlights | 5.2:1 (AA) |
| \`--accent-success\` | \`#10B981\` | \`#34D399\` | Success states, completion checkmarks | 4.8:1 (AA) |
| \`--accent-warning\` | \`#F59E0B\` | \`#FBBF24\` | Warnings, pending states, rate limit alerts | 4.5:1 (AA) |
| \`--accent-danger\` | \`#EF4444\` | \`#F87171\` | Destructive actions, system errors | 5.1:1 (AA) |

### Typography Scale
- **Display / Headings:** Inter / Outfit, Semi-Bold & Bold.
- **Body:** Inter, Regular & Medium.
- **Monospace / Code:** JetBrains Mono / Fira Code.

| Level | Size | Line Height | Weight | Tracking | Usage |
|---|---|---|---|---|---|
| **Display H1** | 28px (1.75rem) | 36px | 700 (Bold) | -0.025em | Primary view headers |
| **Section H2** | 20px (1.25rem) | 28px | 600 (Semi-Bold) | -0.02em | Panel titles, modal headers |
| **Card H3** | 15px (0.9375rem) | 22px | 600 (Semi-Bold) | -0.01em | Group headers, item titles |
| **Body (Default)** | 13px (0.8125rem) | 20px | 400 (Regular) | 0 | Descriptions, data tables |
| **Caption / Meta** | 11px (0.6875rem) | 16px | 500 (Medium) | +0.01em | Timestamps, status pills, hints |
| **Code Block** | 12px (0.75rem) | 18px | 500 (Medium) | 0 | DDL, CLI commands, JSON payloads |

### Spacing & Layout Tokens
- **Grid Base:** 4px unit (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px).
- **Border Radii:** \`rounded-sm\` (4px), \`rounded\` (6px), \`rounded-lg\` (8px), \`rounded-full\` (9999px).
- **Responsive Breakpoints:**
  - **Mobile:** \`< 640px\` (Single column, bottom action sheet, drawer navigation).
  - **Tablet:** \`640px – 1024px\` (Adaptive split view, collapsible sidebar).
  - **Desktop:** \`> 1024px\` (Full fixed-viewport multi-column desktop layout).

---

## 2. Information Architecture & Navigation Shell

### Global Application Shell
\`\`\`
+-----------------------------------------------------------------------------+
| [LOGO] Archly: ${cleanTitle}                 [Status: IDLE]  [Settings] [?] |
+-------------------+---------------------------------------------------------+
| NAVIGATION        | MAIN WORKSPACE VIEWPORT                                 |
|                   |                                                         |
| > Workspace       |  +---------------------------------------------------+  |
| > Specifications  |  | Active Document / Execution Stage                 |  |
| > Milestones      |  |                                                   |  |
| > Artifacts       |  |                                                   |  |
|                   |  +---------------------------------------------------+  |
|                   |                                                         |
|                   |  +---------------------------------------------------+  |
| [Telemetry Bar]   |  | Action Bar: [Download ZIP] [Export PDF] [Execute] |  |
| Tokens: 12.4k     |  +---------------------------------------------------+  |
+-------------------+---------------------------------------------------------+
| Status: All systems nominal                     Port: 4000 | Engine: v1.0   |
+-----------------------------------------------------------------------------+
\`\`\`

---

## 3. Key Screen Layouts & Wireframes

### Screen 1: Initial Requirement Formulation & Questionnaire
- **Purpose:** Allow users to specify initial software requirements and answer targeted clarifying questions.
- **Layout Structure:** Central interactive terminal HUD with auto-expanding prompt input.
- **Wireframe:**
\`\`\`
+-----------------------------------------------------------------------------+
| $ archly init --interactive                                       [?] [X]   |
+-----------------------------------------------------------------------------+
| Concept Specification:                                                      |
| +-------------------------------------------------------------------------+ |
| | > Build a high-performance system for developer workflows...           | |
| +-------------------------------------------------------------------------+ |
|                                                                             |
| Inference Engine Configuration:                                             |
| (*) Groq Cloud (Ultra-Fast)    ( ) NVIDIA NIM    ( ) Local LLM (Ollama)     |
| Model: [meta-llama/llama-3.3-70b-versatile               v]                 |
| API Key: [ **************************************** ] [Verify]              |
|                                                                             |
| [ $ archly run --execute-pipeline                                         ] |
+-----------------------------------------------------------------------------+
\`\`\`

### Screen 2: Real-time Multi-Stage Execution Telemetry
- **Purpose:** Stream document chunks and live token counts during generation.
- **Layout Structure:** Split layout with left progress stepper (Stages 1-14) and right streaming terminal.
- **Wireframe:**
\`\`\`
+------------------------------------+----------------------------------------+
| PIPELINE TELEMETRY                 | LIVE STREAMING COMPILER                |
+------------------------------------+----------------------------------------+
| [x] 01. Research & Discovery       | # System Architecture                  |
| [x] 02. System Architecture        |                                        |
| [>] 08. UI & UX Design [STREAMING] | \`\`\`mermaid                             |
| [ ] 09. Folder & File Structure    | flowchart TD                           |
| [ ] 10. Development Roadmap        |   Client[Web & Desktop] --> Gateway    |
| [ ] 11. Testing & QA Plan          | \`\`\`                                    |
| [ ] 12. Deployment & DevOps        |                                        |
| [ ] 13. Risk Register              | Tokens: 1,420 | Elapsed: 4.2s          |
| [ ] 14. Executive Summary          |                                        |
+------------------------------------+----------------------------------------+
\`\`\`

---

## 4. Component Catalog & State Matrix

| Component | Default | Hover | Active / Focused | Disabled | Error |
|---|---|---|---|---|---|
| **Primary Button** | Indigo 500 bg, white text | Indigo 600 bg, brightness 110% | Scale 0.99, 2px focus ring | Opacity 40%, not-allowed | Red 500 bg, alert icon |
| **Form Input** | Slate 800 bg, border 700 | Border Slate 500 | Border Indigo 400, glow | Opacity 50%, read-only | Red 400 border, helper text |
| **Status Pill** | Muted bg, 11px mono | Subtle border highlight | Inverted text / fill | Muted grey | Red pulse indicator |
| **Tab / Sidebar Item** | Transparent bg, slate text | White/5 hover bg | Indigo glow bg, bold text | Hidden | Yellow warn icon |

---

## 5. Accessibility (a11y) & UX Guidelines
1. **Contrast Standards:** All text elements adhere to WCAG 2.1 AA (minimum 4.5:1 for normal text, 3:1 for large text and UI controls).
2. **Keyboard Navigation:** Full keyboard accessibility across interactive controls with high-contrast focus rings (\`outline: 2px solid var(--accent-primary)\`).
3. **Screen Reader Support:** Semantic HTML5 landmarks (\`<header>\`, \`<nav>\`, \`<main>\`, \`<aside>\`, \`<footer>\`) with \`aria-live="polite"\` status announcements.
4. **Motion & Feedback:** Micro-interactions constrained to < 200ms with \`prefers-reduced-motion\` support.
`;

    case 9:
      return `# Folder & File Structure

\`\`\`text
archly/
├── apps/
│   ├── web/                          # React 18 + Vite frontend
│   │   ├── public/                   # Static assets & icons
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Header.tsx        # Top navigation & status bar
│   │   │   │   ├── HeroInput.tsx     # Project idea prompt & model picker
│   │   │   │   ├── ClarifyModal.tsx  # Clarifying questions form
│   │   │   │   ├── PipelineStepper.tsx # 14-stage progress telemetry
│   │   │   │   ├── MarkdownViewer.tsx# GFM renderer with Mermaid
│   │   │   │   ├── FileTree.tsx      # Sidebar file navigator
│   │   │   │   ├── PromptLabModal.tsx# Power-user prompt customization
│   │   │   │   └── HistoryView.tsx   # Saved blueprints grid
│   │   │   ├── hooks/
│   │   │   │   └── useBlueprint.ts   # Unified state & SSE stream hook
│   │   │   ├── lib/
│   │   │   │   └── api.ts            # Typed HTTP & SSE client
│   │   │   ├── App.tsx               # Primary layout & routing state
│   │   │   ├── index.css             # Tailwind & typography styling
│   │   │   └── main.tsx              # React DOM entrypoint
│   │   ├── index.html
│   │   ├── tailwind.config.js
│   │   └── vite.config.ts
│   └── server/                       # Node.js + Express backend
│       ├── prisma/
│       │   ├── schema.prisma         # SQLite data models
│       │   └── dev.db
│       ├── storage/                  # Generated blueprint artifacts
│       ├── src/
│       │   ├── adapters/
│       │   │   ├── unifiedAdapter.ts # Unified AI provider abstraction
│       │   │   ├── openrouter.ts     # OpenRouter API client
│       │   │   ├── groq.ts           # Groq API client
│       │   │   ├── nvidiaNim.ts      # NVIDIA NIM API client
│       │   │   └── demoProvider.ts   # Zero-key sandbox generator
│       │   ├── pipeline/
│       │   │   ├── orchestrator.ts   # 14-stage execution engine
│       │   │   └── prompts.ts        # Master meta-prompts
│       │   ├── generators/
│       │   │   ├── markdownAssembler.ts # Frontmatter & disk writer
│       │   │   ├── pdfRenderer.ts    # Merged styled PDF generator
│       │   │   └── zipPackager.ts    # Streaming ZIP packager
│       │   ├── routes/
│       │   │   ├── providers.ts      # Provider & model catalog API
│       │   │   └── projects.ts       # Blueprint lifecycle & downloads
│       │   ├── config.ts             # Environment & endpoint constants
│       │   └── server.ts             # Express application root
│       └── package.json
├── packages/
│   └── shared-types/                 # Shared TypeScript contracts
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── package.json                      # Monorepo workspaces root
└── README.md
\`\`\`

## Directory Purpose Matrix
| Directory | Responsibility |
|---|---|
| \`apps/web\` | Client-side user interface, real-time SSE listener, Markdown rendering, and download triggers. |
| \`apps/server\` | REST API, SSE streaming endpoints, database operations, AI provider adapters, and artifact compilation. |
| \`packages/shared-types\` | Single source of truth for interfaces, schemas, and stage definitions used by both web and server. |
`;

    case 10:
      return `# Development Roadmap & Milestones

## 1. Timeline Gantt Chart

\`\`\`mermaid
gantt
    title Product Delivery Timeline
    dateFormat  YYYY-MM-DD
    section Phase 0 - Setup
    Monorepo and Scaffolding       :done, 2026-10-01, 2d
    section Phase 1 - Engine
    AI Provider Adapters         :active, 2026-10-03, 3d
    14-Stage Orchestrator        :2026-10-06, 4d
    section Phase 2 - Frontend
    Interactive Generator UI     :2026-10-10, 4d
    Markdown and Mermaid Preview   :2026-10-14, 3d
    section Phase 3 - Artifacts
    PDF and ZIP Exporters          :2026-10-17, 3d
    section Phase 4 - Launch
    QA and Hardening               :2026-10-20, 2d
\`\`\`

## 2. Detailed Phases

### Phase 0: Foundation & Scaffolding
- [x] Configure npm workspaces and shared TypeScript types.
- [x] Initialize Prisma with SQLite database schema.
- [x] Configure Vite, Tailwind CSS, and dark-mode design system.
- *Definition of Done:* Both server and web build cleanly with zero type errors.

### Phase 1: Core AI Pipeline Engine
- [x] Implement OpenRouter, Groq, and NVIDIA NIM live model discovery.
- [x] Build unified streaming completion adapter.
- [x] Implement 14-stage sequential prompt chain with cumulative context.
- *Definition of Done:* Full 14-stage pipeline completes against test prompt in < 90 seconds.

### Phase 2: Frontend Application Studio
- [x] Hero input with provider tabs, model selectors, and BYOK input.
- [x] Clarifying questions form with smart default bypass.
- [x] Live 14-stage execution stepper with token and elapsed time telemetry.
- [x] File-tree explorer and GFM viewer with client-side Mermaid rendering.
- *Definition of Done:* User can review each document in real time as tokens arrive.

### Phase 3: Packaging & Production Polish
- [x] YAML frontmatter metadata attachment.
- [x] Merged vector PDF compiler with cover page and table of contents.
- [x] Streaming ZIP download packaging.
- [x] Single-stage regeneration support.
- *Definition of Done:* Downloaded ZIP expands into 13 properly formatted files and 1 PDF.
`;

    case 11:
      return `# Testing & QA Plan

## 1. Testing Strategy Layers

\`\`\`mermaid
flowchart TD
    E2E["End-to-End Tests (Playwright) - Critical User Flows"] --> INT["Integration Tests (Supertest) - API and Database Contracts"]
    INT --> UNIT["Unit Tests (Vitest) - Pure Functions and Transformers"]
    style E2E fill:#1e1e2e,stroke:#f38ba8,stroke-width:2px
    style INT fill:#1e1e2e,stroke:#fab387,stroke-width:2px
    style UNIT fill:#1e1e2e,stroke:#a6e3a1,stroke-width:2px
\`\`\`

- **Unit Tests:** Validate individual provider request transformers, frontmatter parsers, and prompt template variable replacements.
- **Integration Tests:** Verify database transactions, SSE event subscriptions, and file packaging pipelines.
- **End-to-End (E2E) Tests:** Automated browser flow traversing idea input -> clarifying questions -> live generation -> file download.

## 2. Test Cases

### TC-01: Free Model Catalog Filtering
- **Input:** Request \`GET /api/providers/openrouter/models\`.
- **Expected:** All returned models strictly exhibit \`isFree: true\` with zero pricing attributes.

### TC-02: Stage 1 Clarification Format
- **Input:** Submit \`POST /api/projects\` with valid idea.
- **Expected:** Response contains valid JSON with non-empty \`restated_idea\` and exactly 5 structured questions.

### TC-03: SSE Stream Resilience
- **Input:** Connect to \`/api/projects/:id/stream\`.
- **Expected:** Receive sequential \`stage_start\`, intermittent \`token_delta\`, and closing \`pipeline_complete\` events without socket disconnect.

### TC-04: ZIP & PDF Generation Integrity
- **Input:** Request \`/api/projects/:id/download/zip\`.
- **Expected:** Received binary stream opens as valid ZIP archive containing 13 \`.md\` files and 1 \`.pdf\` file.

## 3. Pre-Launch QA Checklist
- [x] All external links to provider API key consoles open in secure target tabs.
- [x] Client BYOK credentials never appear in server log files.
- [x] Mobile viewport displays readable single-column preview layout.
`;

    case 12:
      return `# Deployment & DevOps Plan

## 1. Target Environments
| Environment | Hosting Target | Purpose | URL / Access |
|---|---|---|---|
| **Local Dev** | Localhost (Node :4000, Vite :3000) | Active development | \`http://localhost:3000\` |
| **Staging** | Render / Fly.io + Supabase | Integration testing & review | \`https://staging.blueprintai.app\` |
| **Production** | Vercel (Web) + Fly.io (API) | Public production release | \`https://blueprintai.app\` |

## 2. Continuous Integration & Deployment (CI/CD)

\`\`\`mermaid
flowchart LR
    Push["Git Push / PR"] --> Lint["Lint and Typecheck"]
    Lint --> Test["Test Suite (Vitest)"]
    Test --> Build["Production Bundle"]
    Build --> Docker["Docker Image Build"]
    Docker --> Deploy["Deploy to Cloud"]
\`\`\`

\`\`\`yaml
name: CI/CD Pipeline
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install
      - run: npm run build
\`\`\`

## 3. Environment Variable Registry
| Variable Name | Required | Default / Example | Purpose |
|---|---|---|---|
| \`PORT\` | No | \`4000\` | HTTP server binding port |
| \`DATABASE_URL\` | Yes | \`file:./dev.db\` | SQLite / PostgreSQL connection URI |
| \`STORAGE_DIR\` | No | \`./storage\` | Directory for persistent blueprint artifacts |
| \`OPENROUTER_BASE_URL\` | No | \`https://openrouter.ai/api/v1\` | OpenRouter API gateway |
| \`GROQ_BASE_URL\` | No | \`https://api.groq.com/openai/v1\` | Groq Cloud API gateway |
| \`NVIDIA_NIM_BASE_URL\` | No | \`https://integrate.api.nvidia.com/v1\` | NVIDIA NIM API gateway |

## 4. Rollback & Monitoring Procedures
- **Healthcheck:** Automated GET probe against \`/api/providers\` every 60 seconds.
- **Rollback:** Instant atomic deployment rollback via container image tagging.
`;

    case 13:
      return `# Risk Register

## 1. Comprehensive Risk Matrix

| # | Risk Description | Category | Likelihood | Impact | Concrete Mitigation Strategy |
|---|---|---|---|---|---|
| **R1** | Upstream provider enforces stricter rate limits on free-tier API endpoints. | Technical | Medium | High | Implement automatic exponential backoff, rate-limit header parsing, and instant fallback model recommendations in the UI. |
| **R2** | User enters invalid or exhausted BYOK API key. | Operational | High | Medium | Perform proactive key verification on Stage 1; return clear error modal with direct link to provider key console. |
| **R3** | Large LLM output truncated mid-stage due to max token constraints. | Technical | Low | Medium | Enforce chunked generation with explicit continuation prompts or switch to 128k+ context models. |
| **R4** | Markdown rendering injection / Cross-Site Scripting (XSS). | Security | Low | High | Enforce default HTML escaping and sanitization inside \`react-markdown\` and PDF generation pipeline. |
| **R5** | Client-side memory exhaustion during long-running multi-stage SSE stream. | Technical | Low | Low | Virtualize document previews and garbage collect token delta buffers after stage completion. |
| **R6** | Provider removes a free model without notice. | Operational | High | Medium | Dynamically query the live \`/models\` endpoint on each session rather than relying on hardcoded lists. |
| **R7** | PDF generation fails on systems lacking headless browser dependencies. | Technical | Medium | High | Utilize pure-JavaScript vector PDF compilation (\`pdfkit\`) with zero external native binary dependencies. |
| **R8** | User attempts to store sensitive proprietary data in project prompt. | Legal | Low | Medium | Prominently display BYOK privacy disclaimers noting that inference calls route directly to the selected provider. |
`;

    case 14:
      return `# Master Executive Summary & Blueprint Package

# Project Blueprint: ${cleanTitle}

> **Elevator Pitch:** An end-to-end implementation-ready specification package synthesized by BluePrintAI, deconstructing "${cleanTitle}" into architectural diagrams, data schemas, API contracts, UI/UX designs, and engineering roadmaps.

---

## 1. Blueprint Package Table of Contents
This planning archive contains 13 authoritative engineering documents:

1. [01_research_and_discovery.md](./01_research_and_discovery.md) — Problem statement, user personas, competitor landscape, and KPIs.
2. [02_architecture.md](./02_architecture.md) — Modular monolith architecture, Mermaid flowcharts, and bottleneck analysis.
3. [03_tech_stack.md](./03_tech_stack.md) — Evaluated technology choices, alternatives, and scaffolding commands.
4. [04_database_schema.md](./04_database_schema.md) — Mermaid ER diagram, field constraints, indexing, and Prisma schema.
5. [05_api_specification.md](./05_api_specification.md) — REST endpoints, request/response payloads, and authentication model.
6. [06_workflow_and_user_flows.md](./06_workflow_and_user_flows.md) — User sequence diagrams, state machines, and branch workflows.
7. [07_ui_ux_design.md](./07_ui_ux_design.md) — Design system foundations, color tokens, typography scale, ASCII wireframes, and WCAG AA guidelines.
8. [08_folder_structure.md](./08_folder_structure.md) — Complete production repository tree layout with directory guide.
9. [09_roadmap.md](./09_roadmap.md) — Phase-by-phase development timeline, task checklists, and Mermaid Gantt chart.
10. [10_testing_plan.md](./10_testing_plan.md) — Unit, integration, E2E test suites, and pre-launch QA checklists.
11. [11_deployment_plan.md](./11_deployment_plan.md) — CI/CD automation, environment variables, and rollback protocols.
12. [12_risk_register.md](./12_risk_register.md) — Comprehensive risk matrix with concrete mitigations.
13. [00_README.md](./00_README.md) — This master executive summary.

---

## 2. Developer Quick-Start Guide (5 Steps)

Follow these 5 steps to turn this blueprint into running code:

1. **Scaffold Repository:** Create the project layout outlined in \`08_folder_structure.md\`.
2. **Initialize Database:** Copy the Prisma schema from \`04_database_schema.md\` and run \`npx prisma db push\`.
3. **Implement Core Routes:** Set up the API contracts specified in \`05_api_specification.md\`.
4. **Wire Frontend & UI Components:** Implement the design tokens, layouts, and states detailed in \`07_ui_ux_design.md\` and \`06_workflow_and_user_flows.md\`.
5. **Execute Milestone Checklist:** Follow the task list in \`09_roadmap.md\` phase by phase.

*Generated by Archly — The Autonomous Project Architect.*
`;

    default:
      return `# Stage ${stageNumber} Output\n\nContent generated for ${cleanTitle}.`;
  }
}
