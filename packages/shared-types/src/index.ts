export type ProviderId = 'openrouter' | 'groq' | 'nvidia_nim' | 'demo' | 'local_llm';

export interface ProviderMetadata {
  id: ProviderId;
  name: string;
  baseUrl: string;
  docsUrl: string;
  keyHelpUrl: string;
  description: string;
  freeTierNotes: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: ProviderId;
  contextLength?: number;
  tags?: ('Fast' | 'Reasoning' | 'Long-context' | 'Coding' | 'Recommended')[];
  isFree: boolean;
  description?: string;
  pricing?: {
    prompt: string | number;
    completion: string | number;
  };
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface ClarificationStageOutput {
  restated_idea: string;
  questions: ClarifyingQuestion[];
}

export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

export interface StageDefinition {
  stageNumber: number;
  name: string;
  filename: string;
  description: string;
  outputType: 'json' | 'markdown';
}

export interface StageData {
  id: string;
  projectId: string;
  stageNumber: number;
  name: string;
  filename: string;
  contentMd: string;
  status: StageStatus;
  tokensUsed?: number | null;
  durationMs?: number | null;
  createdAt: string;
}

export type ProjectStatus = 'pending' | 'running' | 'completed' | 'failed' | 'partial' | 'paused';

export interface ProjectData {
  id: string;
  userId?: string | null;
  title: string;
  originalPrompt: string;
  restatedIdea?: string;
  clarifyingAnswers: Record<string, string>;
  questions?: ClarifyingQuestion[];
  provider: ProviderId;
  model: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  stages: StageData[];
  pdfUrl?: string | null;
  zipUrl?: string | null;
}

// Request and Response contracts
export interface CreateProjectRequest {
  prompt: string;
  provider: ProviderId;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  customPrompts?: Record<number, string>;
}

export interface CreateProjectResponse {
  projectId: string;
  restatedIdea: string;
  questions: ClarifyingQuestion[];
}

export interface SubmitAnswersRequest {
  answers: Record<string, string>;
  apiKey?: string;
  baseUrl?: string;
  customPrompts?: Record<number, string>;
}

export interface RegenerateStageRequest {
  apiKey?: string;
  baseUrl?: string;
  customPrompt?: string;
}

export type SSEEventType =
  | 'stage_start'
  | 'token_delta'
  | 'stage_complete'
  | 'pipeline_complete'
  | 'error';

export interface SSEStageStartPayload {
  stageNumber: number;
  name: string;
  filename: string;
}

export interface SSETokenDeltaPayload {
  stageNumber: number;
  delta: string;
}

export interface SSEStageCompletePayload {
  stageNumber: number;
  name: string;
  filename: string;
  contentMd: string;
  tokensUsed?: number;
  durationMs: number;
}

export interface SSEPipelineCompletePayload {
  projectId: string;
  status: ProjectStatus;
  pdfUrl?: string;
  zipUrl?: string;
}

export interface SSEErrorPayload {
  stageNumber?: number;
  error: string;
  recoverable?: boolean;
}

export const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    stageNumber: 1,
    name: 'Requirement Extraction & Clarification',
    filename: '00_clarifications.json',
    description: 'Deconstruct idea and formulate targeted clarifying questions',
    outputType: 'json',
  },
  {
    stageNumber: 2,
    name: 'Research & Discovery (R&D)',
    filename: '01_research_and_discovery.md',
    description: 'Problem statement, personas, competitor landscape, KPIs, risks and scope boundaries',
    outputType: 'markdown',
  },
  {
    stageNumber: 3,
    name: 'System Architecture',
    filename: '02_architecture.md',
    description: 'Architecture style, Mermaid flowcharts, components, end-to-end data flow, bottlenecks',
    outputType: 'markdown',
  },
  {
    stageNumber: 4,
    name: 'Tech Stack & Tooling',
    filename: '03_tech_stack.md',
    description: 'Layer-by-layer stack matrix with justifications, alternatives, and local dev setup',
    outputType: 'markdown',
  },
  {
    stageNumber: 5,
    name: 'Database Schema',
    filename: '04_database_schema.md',
    description: 'Entity relationships, Mermaid erDiagram, cascade rules, indexing, production DDL/Prisma',
    outputType: 'markdown',
  },
  {
    stageNumber: 6,
    name: 'API Specification',
    filename: '05_api_specification.md',
    description: 'Exhaustive REST API spec with request/response schemas, error status codes, auth strategy',
    outputType: 'markdown',
  },
  {
    stageNumber: 7,
    name: 'Workflow & User Flows',
    filename: '06_workflow_and_user_flows.md',
    description: 'User stories, Mermaid sequence diagrams, state diagrams, edge cases, team workflows',
    outputType: 'markdown',
  },
  {
    stageNumber: 8,
    name: 'UI & UX Design Specification',
    filename: '07_ui_ux_design.md',
    description: 'Design system foundations, color tokens, typography scale, responsive layouts, ASCII wireframes, and WCAG AA guidelines',
    outputType: 'markdown',
  },
  {
    stageNumber: 9,
    name: 'Folder & File Structure',
    filename: '08_folder_structure.md',
    description: 'Complete production repository tree layout with descriptions for core directories and modules',
    outputType: 'markdown',
  },
  {
    stageNumber: 10,
    name: 'Development Roadmap & Milestones',
    filename: '09_roadmap.md',
    description: 'Phase-by-phase timeline with task checklists, Definition of Done, and Mermaid Gantt chart',
    outputType: 'markdown',
  },
  {
    stageNumber: 11,
    name: 'Testing & QA Plan',
    filename: '10_testing_plan.md',
    description: 'Unit, integration, E2E test suites, load test thresholds, pre-launch QA checklists',
    outputType: 'markdown',
  },
  {
    stageNumber: 12,
    name: 'Deployment & DevOps Plan',
    filename: '11_deployment_plan.md',
    description: 'Environments, CI/CD pipeline, environment variable registry, rollback & monitoring setup',
    outputType: 'markdown',
  },
  {
    stageNumber: 13,
    name: 'Risk Register',
    filename: '12_risk_register.md',
    description: 'Technical, market, legal, operational risks matrix with impact ratings and mitigations',
    outputType: 'markdown',
  },
  {
    stageNumber: 14,
    name: 'Executive Summary & README',
    filename: '00_README.md',
    description: 'Master package overview, elevator pitch, table of contents, 5-step quick start guide',
    outputType: 'markdown',
  },
];
