export const SHARED_SYSTEM_PROMPT = `You are a principal enterprise architect, senior technical co-founder, and staff technical writer combined.
You produce exhaustive, industry-grade, production-ready technical architecture blueprints in clean GitHub-Flavored Markdown.

CRITICAL QUALITY & DETAIL STANDARDS:
1. EXHAUSTIVE DETAIL: Never write high-level summaries, placeholder text, or hand-waving bullet points. Provide complete, granular, production-ready specifications that an engineering team could build from directly.
2. CONCRETE SPECIFICS: Always specify real, modern technologies, exact library versions, concrete file and folder paths, realistic database column types with constraints, and precise API request/response payloads.
3. COMPREHENSIVE TABLES: Utilize deep Markdown tables with multi-column attributes (e.g., field types, nullability, validation rules, error codes, performance thresholds, SLAs, trade-offs).
4. GUARANTEED VISUAL DIAGRAMS: Whenever visual architecture, system components, data flows, entity relationships, state machines, user journeys, test pyramids, or deployment pipelines are specified, you MUST include a clean, syntax-valid Mermaid diagram using fenced \`\`\`mermaid code blocks.
5. MERMAID SYNTAX STRICTNESS:
   - Always wrap node, state, or participant labels containing special characters (parentheses, brackets, colons, commas) in double quotes (e.g. id["API Gateway (Kong)"]).
   - Never use unescaped '&' inside labels; write 'and' instead.
   - In ER diagrams (\`erDiagram\`), use standard Mermaid attributes and relationships (e.g. \`CUSTOMER ||--o{ ORDER : places\`).
   - In sequence diagrams (\`sequenceDiagram\`), declare participants with clean aliases if they have complex names.
   - In Gantt charts (\`gantt\`), never include colons in section names.
6. CODE SAMPLES: Provide ready-to-run code snippets (e.g. Prisma schema, SQL DDL, API endpoints, test suites, CLI scaffolding) with proper type signatures and error handling.
7. CONSISTENCY: Maintain strict consistency with all PRIOR CONTEXT provided. Do not contradict earlier stack or architectural decisions.
8. FORMAT: Output ONLY the Markdown document body. No introductory pleasantries, no conversational preamble, no closing remarks. Start with a single H1 header matching the document section.`;

export const STAGE_PROMPT_TEMPLATES: Record<number, (ctx: Record<string, any>) => string> = {
  1: (ctx) => `The user wants to build: "${ctx.user_prompt}"

Do two things:
1. Extract a structured one-paragraph restatement of the idea: target users, core problem solved, and the single most important feature.
2. Generate exactly 5 short clarifying questions (multiple-choice where possible, 2-4 options each) that would materially change the architecture or scope if answered differently. Cover: target platform (web/mobile/both/desktop), expected scale (hobby/startup MVP/enterprise), team size (solo/small team), timeline pressure (weekend hack/MVP in weeks/production-grade), and monetization (free/subscription/one-time/none).

Return valid JSON only, in this exact shape:
{
  "restated_idea": "...",
  "questions": [
    { "id": "platform", "question": "...", "options": ["Web Application", "Mobile (iOS & Android)", "Cross-Platform (Web + Mobile)", "Desktop (Tauri / Native)"] },
    { "id": "scale", "question": "...", "options": ["Hobby / Prototype (<1k users)", "Startup MVP (10k - 50k users)", "High-Growth Scale (100k+ users)", "Enterprise Multi-Tenant"] },
    { "id": "team", "question": "...", "options": ["Solo Developer", "Small Core Team (2-5)", "Growing Engineering Team (6-15)"] },
    { "id": "timeline", "question": "...", "options": ["Rapid Prototype (1-2 Weeks)", "Production MVP (4-8 Weeks)", "Enterprise Hardened (3-6 Months)"] },
    { "id": "monetization", "question": "...", "options": ["Free / Open Source", "Freemium + Stripe Tiers", "Usage-Based Metered Billing", "B2B Enterprise Contracts"] }
  ]
}`,

  2: (ctx) => `PRIOR CONTEXT:
Idea: ${ctx.restated_idea || ctx.user_prompt}
User answers: ${JSON.stringify(ctx.clarifying_answers || {})}

Write "01_research_and_discovery.md" — an exhaustive, industry-grade Research & Discovery document covering:
1. Problem Statement:
   - Deep analysis of the root pain points, current manual or fragmented workarounds, and user friction.
   - The quantified cost of inaction for target users.
2. Target Audience & In-Depth User Personas:
   - Develop 3 distinct, realistic personas. For each persona include: Name & Title, Demographics & Background, Core Responsibilities & Daily Workflow, Key Pain Points & Frustrations, Desired Outcomes, and Technical Comfort Level.
3. Market & Competitive Landscape Matrix:
   - Provide a comprehensive Markdown comparison table evaluating at least 4-5 direct and indirect competitors or alternative approaches.
   - Table columns: Competitor / Alternative | Target Segment | Key Strengths | Critical Deficiencies | Pricing Model | Our Strategic Differentiator.
   - Summary of the "Unfair Advantage" / moat for this product.
4. Core Value Proposition:
   - Clear, defensible primary value proposition statement.
   - 4-5 strategic supporting pillars with concrete business impacts.
5. Success Metrics & KPI Framework:
   - A structured Markdown table with 6-8 measurable KPIs across Acquisition, Activation, Retention, Performance, and Revenue.
   - Table columns: Metric Name | Category | Measurement Formula / Source | Baseline Target (MVP) | Scale Target (12 Mo) | Business Impact.
6. Assumptions & Risk Validation Matrix:
   - Markdown table evaluating critical product, market, and technical assumptions.
   - Table columns: Assumption | Category | Validation Method | Invalidation Trigger | Contingency Plan.
7. Scope Boundaries & Feature Matrix:
   - Explicit two-column Markdown table detailing "In Scope (MVP v1.0)" vs "Out of Scope (Post-v1 / Future Roadmap)" across Core Engine, Auth & Access, Integrations, Data & Analytics, and Administration.`,

  3: (ctx) => `PRIOR CONTEXT:
${ctx.summary_of_stage_2 || ''}
Clarifications: ${JSON.stringify(ctx.clarifying_answers || {})}

Write "02_architecture.md" — a comprehensive, production-ready System Architecture Specification covering:
1. Architecture Paradigm & Style:
   - Detailed justification for the chosen architectural pattern (Modular Monolith, Event-Driven Microservices, or Serverless Hybrid) based strictly on the scale and team size requirements.
   - Architectural Trade-off Analysis table comparing 3 architectural options across Complexity, Dev Velocity, Latency, Operational Cost, and Scalability.
2. High-Level Architecture Diagram:
   - Provide a comprehensive Mermaid \`flowchart TD\` diagram displaying all major architectural tiers:
     * Client Layer (Web, Mobile, Desktop clients, CDN/Edge)
     * Ingress & Security Layer (Reverse Proxy, API Gateway, Rate Limiting, WAF, SSL termination)
     * Application & Service Layer (Core API Services, Background Worker Queues, Auth Service)
     * Data & State Layer (Primary Relational/Document DB, In-Memory Cache/Redis, Object Storage)
     * External Integrations & Telemetry (Third-party APIs, Observability/APM)
   - Ensure all node labels with special characters or parentheses are enclosed in double quotes.
3. Component Responsibilities & Protocol Matrix:
   - Exhaustive Markdown table detailing every subsystem:
     Table columns: Component Name | Layer | Core Responsibilities | Protocols Used (HTTP/REST, gRPC, WebSocket) | Upstream Dependencies | Downstream Dependencies | Technology / Framework.
4. End-to-End Data Flow Walks:
   - Detailed numbered step-by-step walkthrough for the product's primary, mission-critical user transaction from client ingress to database persistence, cache synchronization, and outbound notifications.
   - Accompany this with a Mermaid \`sequenceDiagram\` detailing the end-to-end message flow across Client, Gateway, Services, Database, and Queue.
5. Third-Party Integrations & External Dependencies:
   - Markdown table detailing all third-party services (Auth, Payments, Email/SMS, AI Inference, Analytics, Object Storage).
   - Table columns: Service / Vendor | Purpose | Auth Protocol | Rate Limits / Quotas | Timeout / Retry Policy | Fallback / Degradation Strategy.
6. Scalability Bottlenecks & Failure Modes:
   - Comprehensive analysis of the top 3 anticipated bottlenecks under 10x and 100x traffic surges.
   - Resilience patterns: Circuit breakers, dead-letter queues (DLQ), connection pooling, backpressure handling, and read/write splitting.
7. Non-Functional Requirements (NFR) SLA Matrix:
   - Markdown table detailing targets for: Availability (e.g. 99.95%), P95 & P99 API Response Latency, RPO (Recovery Point Objective), RTO (Recovery Time Objective), Concurrent Connections, and Compliance Standards (GDPR, SOC2, HIPAA).`,

  4: (ctx) => `PRIOR CONTEXT:
${ctx.summary_of_stage_3 || ''}

Write "03_tech_stack.md" — a definitive, production-grade Technology Stack Specification:
1. Full-Stack Technology Evaluation & Selection Matrix:
   - Provide an exhaustive, multi-tier Markdown table covering every layer of the modern stack:
     * Frontend Framework & Runtime
     * Client Styling & Design System
     * Client State Management & Data Fetching
     * Desktop / Mobile Runtime (if applicable)
     * Backend Framework & Language Runtime
     * API Communication Style (REST, GraphQL, tRPC, gRPC)
     * Primary Database (Relational or Document)
     * Database ORM / Migration Engine
     * In-Memory Caching & Session Store
     * Background Job Processing & Message Broker
     * Authentication & Authorization Provider
     * Cloud / Object Storage
     * Automated Testing Frameworks (Unit, Integration, E2E)
     * Continuous Integration & Deployment (CI/CD)
     * Cloud Infrastructure & Hosting Platform
     * Observability, Logging & APM
   - Table columns: Architectural Layer | Technology & Exact Version | Why Chosen / Key Strengths | Key Trade-offs & Limitations | Credible Alternative Evaluated | Rejection Rationale.
2. Technology Integration Topology:
   - A clean Mermaid \`flowchart LR\` showing how the selected runtime technologies interface with each other.
3. Development Tooling & Local Environment Standards:
   - Package manager, Node/Python/Go version constraints, linting (ESLint, Biome), code formatting (Prettier), Git hooks (Husky).
4. Zero-to-One Local Setup & Scaffolding Script:
   - Provide the complete, runnable command-line sequence (in a fenced bash/sh code block) to bootstrap the repository, initialize dependencies, configure environment variables, and run the development suite from zero.`,

  5: (ctx) => `PRIOR CONTEXT:
${ctx.summary_of_stage_3 || ''}
${ctx.summary_of_stage_4 || ''}

Write "04_database_schema.md" — an exhaustive, production-ready Database Architecture & Schema Specification:
1. Entity-Relationship (ER) Overview Diagram:
   - A complete Mermaid \`erDiagram\` displaying all database entities, attributes, data types, primary keys, foreign keys, and relationships (one-to-one, one-to-many, many-to-many).
   - Ensure all relationship cardinalities (e.g., \`||--o{\`, \`}|..|{\`) are properly formatted according to Mermaid v10+ syntax.
2. Granular Table / Collection Definitions:
   - For EVERY entity in the domain model (Users, Accounts, Core Domain Entities, Transactions, Audit Logs, etc.), provide a dedicated Markdown table:
     Table columns: Column Name | Data Type | Nullable (Yes/No) | Default Value | Constraints / Foreign Key | Index Type | Description.
3. Indexing & Query Optimization Strategy:
   - A dedicated Markdown table detailing the primary high-volume queries, along with required composite indexes, unique indexes, and partial/GIN indexes.
   - Table columns: Table | Index Name | Indexed Columns | Index Type (B-Tree/Hash/GIN) | Target Query / Use Case | Performance Rationale.
4. Cascading Rules & Data Integrity:
   - Table specifying ON DELETE and ON UPDATE behaviors across all foreign key relationships (CASCADE, SET NULL, RESTRICT).
   - Soft-delete strategy and audit trail retention policy.
5. Complete Production-Ready Schema Definition:
   - Provide the full, ready-to-run schema inside a fenced code block matching the ORM / Database chosen in Stage 4 (e.g. Prisma Schema \`schema.prisma\` or complete PostgreSQL SQL DDL with CREATE TABLE, ALTER TABLE, and CREATE INDEX statements).`,

  6: (ctx) => `PRIOR CONTEXT:
${ctx.summary_of_stage_3 || ''}
${ctx.summary_of_stage_5 || ''}

Write "05_api_specification.md" — a comprehensive, enterprise-grade REST / HTTP API Specification covering all MVP & core endpoints:
1. API Architecture & Global Standards:
   - Base URLs, API versioning strategy (e.g. \`/api/v1\`), global pagination standard (cursor-based vs limit/offset), sorting/filtering conventions, and global HTTP status codes.
2. Authentication & Security Flow Diagram:
   - Mermaid \`sequenceDiagram\` showing client credentials exchange, JWT access token issue, refresh token rotation, and Authorization header injection (\`Bearer <token>\`).
3. Global Headers & Error Response Contract:
   - Standard request & response headers (Rate limiting headers, Correlation IDs, Idempotency keys).
   - Global standard Error Response JSON shape with code, message, and details array.
4. Complete Endpoint Catalog by Resource:
   - Group endpoints logically (e.g., Auth, Users, Core Resource CRUD, Search/Filter, Operations, Admin).
   - For EVERY endpoint provide:
     * Method & Path (e.g., \`POST /api/v1/projects\`)
     * Summary & Business Rules
     * Authentication & Role Permissions (e.g. Public, Authenticated User, Admin)
     * Parameters Table: Parameter | Location (Path/Query/Header) | Type | Required (Yes/No) | Description & Constraints
     * Request Body: Complete, realistic JSON example with realistic mock data
     * Success Response: HTTP Status (200 OK, 201 Created) with complete realistic JSON response payload
     * Error Responses Table: Status Code | Error Code | Trigger Condition | Mitigation
5. Rate Limiting & Webhooks:
   - Rate limit tiers (Anonymous vs Authenticated vs Enterprise).
   - Inbound/outbound webhook event signatures, retry schedules (exponential backoff), and verification HMAC headers.`,

  7: (ctx) => `PRIOR CONTEXT:
${ctx.summary_of_stage_2 || ''}
${ctx.summary_of_stage_3 || ''}

Write "06_workflow_and_user_flows.md" — a detailed System Workflows & User Flows Specification:
1. Primary Core User Journey:
   - Exhaustive step-by-step narrative of the primary user transaction from intent to completion.
   - Accompanying Mermaid \`sequenceDiagram\` showing all interactions across User, Client UI, API Gateway, Background Workers, Database, and Notification Services.
2. Secondary Critical Workflows:
   - Onboarding & Identity Verification flow.
   - Error Handling & Payment Recovery flow.
   - Collaborative Sharing / Team Member Invitation flow.
3. Core Domain State Machine:
   - Provide a comprehensive Mermaid \`stateDiagram-v2\` illustrating all lifecycle states of the core domain entity (e.g. Draft -> Submitted -> Processing -> Active -> Suspended -> Archived).
   - Include transitions, guard conditions, and failure rollback states.
4. Edge Cases & Exception Handling Matrix:
   - Markdown table detailing at least 6 unexpected failure conditions (network timeout, concurrent editing conflict, payment failure, rate limit exceeded, malformed input).
   - Table columns: Scenario | Detection Mechanism | System Fail-Safe Action | User Notification | Recovery Path.
5. Team Engineering Delivery Workflow:
   - Git branching strategy (Trunk-based or GitFlow), PR review requirements, automated test gates, and continuous deployment environments.`,

  8: (ctx) => `PRIOR CONTEXT:
${ctx.summary_of_stage_2 || ''}
${ctx.summary_of_stage_4 || ''}
${ctx.summary_of_stage_7 || ''}

Write "07_ui_ux_design.md" — an exhaustive UI/UX Design Specification & Design System document:
1. Design System Foundations:
   - Color Palette Matrix: Primary, Secondary, Accent, Functional (Success, Warning, Error, Info), Neutral Scale (50 to 950) with exact HEX/HSL tokens and WCAG contrast ratings.
   - Typography Scale Table: Role (Display, H1-H4, Body, Monospace) | Font Family | Size (px/rem) | Line Height | Weight | Letter Spacing | Usage.
   - Spacing & Layout Grid: 4px/8px scale, container max-widths, and responsive breakpoints (Mobile <640px, Tablet 640-1024px, Desktop >1024px, Wide >1440px).
   - Elevation, Borders & Glassmorphic Tokens: Elevation levels, border radiuses, shadows, and dark-mode backdrop filters.
2. User Navigation Architecture Diagram:
   - A Mermaid \`flowchart LR\` mapping screen-to-screen user navigation paths and modal overlays.
3. Screen Layouts & Wireframes (ASCII Diagrams):
   - Provide detailed ASCII wireframes and layout breakdowns for at least 3-4 primary screens (e.g. Dashboard/Workspace, Core Editor/Creation Flow, Detail Inspector, Settings).
   - For EACH screen detail the 4 UI States:
     * Loading / Skeleton State
     * Empty State (with onboarding call to action)
     * Populated / Default State
     * Error / Network Disconnection State
4. Component Library Specifications:
   - Buttons, Form Inputs, Dropdowns, Modal Dialogs, Data Tables, and Status Badges.
   - Table of Component Props, variants, and interactive states (Default, Hover, Active, Focus, Disabled).
5. Accessibility (a11y) & UX Standards:
   - WCAG 2.1 AA Compliance checklist, ARIA landmark roles, keyboard navigation (Tab indices, Escape modal dismissal, Command Palette shortcuts), and micro-animations.`,

  9: (ctx) => `PRIOR CONTEXT:
${ctx.summary_of_stage_4 || ''}
${ctx.summary_of_stage_8 || ''}

Write "08_folder_structure.md" — a definitive Repository & Project Architecture Specification:
1. Complete Directory & File Tree:
   - Provide the complete, production-ready repository tree structure inside a fenced text code block using clean tree indentation characters (├──, └──, │).
   - Include all key configuration files, environment definitions, CI workflows, source code directories, shared packages, tests, and documentation.
2. Architectural Layer Responsibilities Table:
   - Comprehensive Markdown table explaining the explicit responsibility of every top-level and second-level directory.
   - Table columns: Path / Directory | Layer | Purpose & Contained Artifacts | Dependency & Import Rules (what can import what).
3. Coding Conventions & File Naming Standards:
   - Explicit naming conventions for components, utilities, database models, tests, and route handlers.
   - Export patterns (named vs default exports) and barrel file (\`index.ts\`) policies.`,

  10: (ctx) => `PRIOR CONTEXT:
${ctx.summary_of_stage_2 || ''}
${ctx.summary_of_stage_3 || ''}
${ctx.summary_of_stage_8 || ''}
Clarifications: ${JSON.stringify(ctx.clarifying_answers || {})}

Write "09_roadmap.md" — an actionable, milestone-driven Engineering Roadmap & Delivery Plan:
1. High-Level Delivery Timeline Gantt Chart:
   - Provide a Mermaid \`gantt\` chart summarizing the execution timeline across all major phases from setup to production release.
   - Ensure the Gantt syntax contains clean dates or relative day indicators (e.g. \`Phase 0 - Foundation :des1, 2026-10-01, 7d\`). Never use colons in section names.
2. Detailed Sprint & Phase Breakdown:
   - Break development into 5 structured phases:
     * Phase 0: Setup, Infrastructure & Scaffolding
     * Phase 1: Core Engine & Data Model Implementation
     * Phase 2: User Interface, Workflows & API Integration
     * Phase 3: External Integrations, Hardening & Security
     * Phase 4: Quality Assurance, Staging & Production Launch
   - For EACH Phase provide:
     * Strategic Phase Goal
     * Estimated Duration (Days / Sprints) & Team Allocation
     * Granular Task Checklist using Markdown checkboxes (\`- [ ] Task Description\`)
     * Critical Dependencies / Blockers
     * Explicit "Definition of Done" (DoD) criteria
3. Pre-Launch Readiness & Go-Live Verification Checklist:
   - Comprehensive checklist covering Security, Load/Stress Testing, Data Backups, DNS/SSL, Telemetry Alerts, Legal/Privacy, and Rollback Procedures.`,

  11: (ctx) => `PRIOR CONTEXT:
${ctx.summary_of_stage_3 || ''}
${ctx.summary_of_stage_6 || ''}
${ctx.summary_of_stage_8 || ''}

Write "10_testing_plan.md" — an enterprise-grade Quality Assurance & Testing Strategy:
1. Testing Architecture & Test Pyramid:
   - Mermaid \`flowchart TD\` displaying the testing pyramid from Unit Tests (broad base) to Integration, Contract, End-to-End (E2E), and Manual Smoke Tests.
2. Testing Strategy & Tooling Matrix:
   - Markdown table covering all testing tiers:
     Table columns: Test Layer | Target Scope | Framework / Tools | Target Code Coverage % | Execution Frequency (Pre-commit, PR CI, Nightly).
3. Concrete Executable Test Cases:
   - Provide real, executable test code snippets (e.g. using Vitest/Jest and Playwright/Cypress) covering:
     * Unit test for core business logic / calculation
     * Integration test for authenticated API endpoint with database mock/transaction
     * End-to-End browser test simulating primary user transaction
4. Performance, Load & Stress Testing Thresholds:
   - Markdown table detailing load testing parameters using tools like k6 or Artillery.
   - Table columns: Scenario | Virtual Users (VU) | Target RPS | P95 Latency Threshold | Max Error Rate | Test Duration.
5. Security & Vulnerability QA Checklist:
   - OWASP Top 10 mitigation verification, dependency vulnerability scanning (Snyk/npm audit), CSRF/CORS verification, and SQL injection fuzzing.`,

  12: (ctx) => `PRIOR CONTEXT:
${ctx.summary_of_stage_4 || ''}
${ctx.summary_of_stage_10 || ''}

Write "11_deployment_plan.md" — a production DevOps, CI/CD & Deployment Specification:
1. CI/CD Pipeline Flow Diagram:
   - A Mermaid \`flowchart LR\` illustrating the automated release pipeline from Git Push -> Lint/Format -> Test Suite -> Docker Build -> Security Scan -> Staging Deployment -> Integration Smoke Test -> Production Promotion.
2. Multi-Environment Configuration Matrix:
   - Markdown table comparing Local, Staging, and Production environments:
     Table columns: Environment | Infrastructure / Host | Domain / URL Pattern | Database Instance | Caching / Redis | Scaling Mode | Deploy Trigger.
3. Environment Variables & Secrets Catalog:
   - Exhaustive Markdown table listing all required environment variables:
     Table columns: Variable Name | Environment (Local/Staging/Prod) | Required (Yes/No) | Purpose | Example Value (non-sensitive) | Secret Management Provider.
4. Infrastructure as Code & Containerization:
   - Ready-to-run multi-stage production \`Dockerfile\` and local \`docker-compose.yml\` snippet.
5. Deployment Strategy & Zero-Downtime Rollback:
   - Rolling update or Blue/Green deployment walkthrough, health check probe specifications (\`/healthz\`, \`/readyz\`), automated rollback triggers, and manual emergency rollback procedures.
6. Observability, Logging & Alerting Playbook:
   - Logging format (JSON structured logs with correlation IDs), metric collection (Prometheus / Datadog), and alert notification thresholds (e.g. 5xx errors > 1% over 5m triggers PagerDuty).`,

  13: (ctx) => `PRIOR CONTEXT:
Brief summary of earlier stages:
${ctx.summary_all || ''}

Write "12_risk_register.md" — a comprehensive Enterprise Risk Management & Mitigation Register:
1. Risk Assessment Methodology & Scoring Matrix:
   - Explanation of Risk Scoring: Likelihood (1-5) x Impact (1-5) = Risk Score (1-25).
2. Comprehensive Risk Register Table:
   - Provide an exhaustive Markdown table evaluating at least 10 project-specific risks across Technical, Architectural, Security, Operational, Regulatory/Legal, and Market categories:
     Table columns: Risk ID | Category | Risk Description | Likelihood (1-5) | Impact (1-5) | Severity Score | Trigger Event | Prevention Strategy | Contingency & Mitigation Action Plan.
3. Incident Response & Disaster Recovery Playbook:
   - Escalation tiers, incident commander roles, RTO/RPO recovery procedures, and post-mortem review framework.`,

  14: (ctx) => `PRIOR CONTEXT:
One-paragraph summary of each document produced in the blueprint:
${ctx.summary_all || ''}

Write "00_README.md" — the Executive Architecture Briefing & Master Index:
1. Project Vision & Executive Pitch:
   - High-level technical pitch, target problem space, key architectural pillars, and anticipated operational velocity.
2. Master Blueprint Document Registry:
   - Structured Markdown table listing all 13 documents in the architecture package:
     Table columns: File Name | Document Title | Primary Audience (Lead Dev, DevOps, Product, QA) | Summary of Decisions Contained.
3. High-Level Technology & Architecture Summary:
   - Executive table summarizing Core Architecture Style, Frontend, Backend, Primary Database, and Hosting Target.
4. Fast-Track Developer Onboarding (Zero to Hello World):
   - 5-step numbered guide for a senior developer picking up this repository cold to clone, configure, migrate, and run the system locally in under 10 minutes.
5. Production Readiness & Contribution Guidelines:
   - Code review standards, branch conventions, and testing requirements before merging to production.`,
};
