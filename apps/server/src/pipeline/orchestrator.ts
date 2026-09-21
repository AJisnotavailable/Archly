import EventEmitter from 'events';
import { prisma } from '../db/client';
import {
  STAGE_DEFINITIONS,
  ClarificationStageOutput,
  ProviderId,
  StageStatus,
} from '@archly/shared-types';
import { generate, ChatMessage } from '../adapters/unifiedAdapter';
import { SHARED_SYSTEM_PROMPT, STAGE_PROMPT_TEMPLATES } from './prompts';
import { attachFrontmatter, saveProjectArtifact } from '../generators/markdownAssembler';
import { generateProjectPDF } from '../generators/pdfRenderer';
import { packageProjectZip } from '../generators/zipPackager';

export class PipelineOrchestrator extends EventEmitter {
  private activeStreams: Map<string, EventEmitter> = new Map();
  private pausedProjects: Set<string> = new Set();
  private activeAbortControllers: Map<string, AbortController> = new Map();
  private activeStageNumbers: Map<string, number> = new Map();

  getStream(projectId: string): EventEmitter {
    if (!this.activeStreams.has(projectId)) {
      this.activeStreams.set(projectId, new EventEmitter());
    }
    return this.activeStreams.get(projectId)!;
  }

  pausePipeline(projectId: string): boolean {
    this.pausedProjects.add(projectId);
    const currentStage = this.activeStageNumbers.get(projectId);
    const controller = this.activeAbortControllers.get(projectId);
    if (controller) {
      try {
        controller.abort();
      } catch {}
      this.activeAbortControllers.delete(projectId);
    }
    const stream = this.getStream(projectId);
    stream.emit('pipeline_paused', { projectId, stageNumber: currentStage });
    return true;
  }

  clearPause(projectId: string): void {
    this.pausedProjects.delete(projectId);
  }

  isPaused(projectId: string): boolean {
    return this.pausedProjects.has(projectId);
  }

  async skipStage(
    projectId: string,
    targetStageNumber?: number
  ): Promise<{ status: string; skippedStage: number; nextStage?: number }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { stages: { orderBy: { stageNumber: 'asc' } } },
    });
    if (!project) throw new Error(`Project ${projectId} not found`);

    let stageToSkip: number = targetStageNumber || 1;
    if (!targetStageNumber) {
      const runningOrPaused = (project.stages as any[]).find((s: any) => s.status === 'running' || s.status === 'paused');
      if (runningOrPaused) {
        stageToSkip = runningOrPaused.stageNumber;
      } else {
        const completed = (project.stages as any[]).filter((s: any) => s.status === 'completed');
        const maxComp = completed.reduce((m: number, s: any) => Math.max(m, s.stageNumber), 1);
        stageToSkip = Math.min(maxComp + 1, STAGE_DEFINITIONS.length);
      }
    }

    const stageDef = STAGE_DEFINITIONS.find((s) => s.stageNumber === stageToSkip);
    if (!stageDef) throw new Error(`Invalid stage number ${stageToSkip}`);

    // Cancel in-flight work for this stage
    this.pausedProjects.add(projectId);
    const controller = this.activeAbortControllers.get(projectId);
    if (controller) {
      try { controller.abort(); } catch {}
      this.activeAbortControllers.delete(projectId);
    }

    // Build skipped markdown placeholder
    const skipContent = attachFrontmatter(
      `# ${stageDef.name}\n\n*Stage was skipped by user request. Downstream architecture stages proceed using original system brief.*\n`,
      {
        title: stageDef.name,
        project: project.title,
        generated_at: new Date().toISOString(),
        provider: project.provider,
        model: project.model,
        stage: stageToSkip,
      }
    );

    await saveProjectArtifact(projectId, stageDef.filename, skipContent);

    const existingRecord = await prisma.stage.findFirst({
      where: { projectId, stageNumber: stageToSkip },
    });

    if (existingRecord) {
      await prisma.stage.update({
        where: { id: existingRecord.id },
        data: {
          contentMd: skipContent,
          status: 'completed',
          durationMs: 100,
          tokensUsed: 0,
        },
      });
    } else {
      await prisma.stage.create({
        data: {
          projectId,
          stageNumber: stageToSkip,
          name: stageDef.name,
          filename: stageDef.filename,
          contentMd: skipContent,
          status: 'completed',
          durationMs: 100,
          tokensUsed: 0,
        },
      });
    }

    const stream = this.getStream(projectId);
    stream.emit('stage_complete', {
      stageNumber: stageToSkip,
      name: stageDef.name,
      filename: stageDef.filename,
      contentMd: skipContent,
      tokensUsed: 0,
      durationMs: 100,
    });

    this.pausedProjects.delete(projectId);
    const nextStage = stageToSkip + 1;

    if (nextStage <= STAGE_DEFINITIONS.length) {
      this.runFullPipeline(projectId, undefined, undefined, nextStage).catch((err) => {
        console.error(`Error after skip in stage ${nextStage}:`, err);
      });
      return { status: 'skipped', skippedStage: stageToSkip, nextStage };
    } else {
      await this.compileArtifacts(projectId);
      await prisma.project.update({
        where: { id: projectId },
        data: {
          status: 'completed',
          pdfUrl: `/api/projects/${projectId}/download/pdf`,
          zipUrl: `/api/projects/${projectId}/download/zip`,
        },
      });
      stream.emit('pipeline_complete', {
        projectId,
        status: 'completed',
        pdfUrl: `/api/projects/${projectId}/download/pdf`,
        zipUrl: `/api/projects/${projectId}/download/zip`,
      });
      return { status: 'completed', skippedStage: stageToSkip };
    }
  }

  async runStage1(
    projectId: string,
    prompt: string,
    provider: ProviderId,
    model: string,
    apiKey?: string,
    customPrompt?: string,
    baseUrl?: string
  ): Promise<ClarificationStageOutput> {
    const stream = this.getStream(projectId);

    const userPromptContent = customPrompt || STAGE_PROMPT_TEMPLATES[1]({ user_prompt: prompt });

    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are an expert technical product architect. Return valid JSON only.' },
      { role: 'user', content: userPromptContent },
    ];

    let fullOutput = '';
    const generator = generate({
      provider,
      apiKey,
      baseUrl,
      model,
      messages,
      temperature: 0.3,
      stageNumber: 1,
      originalPrompt: prompt,
    });

    for await (const chunk of generator) {
      fullOutput += chunk;
      stream.emit('token_delta', { stageNumber: 1, delta: chunk });
    }

    // Parse JSON
    let parsed: ClarificationStageOutput;
    try {
      const cleanJson = fullOutput
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.warn('Failed to parse Stage 1 output as raw JSON, using fallback parsing:', e);
      parsed = {
        restated_idea: `System blueprint for: ${prompt}`,
        questions: [
          {
            id: 'platform',
            question: 'What is the target platform for your initial release?',
            options: ['Web Application', 'Mobile App', 'Both Web & Mobile', 'Desktop App'],
          },
          {
            id: 'scale',
            question: 'What is the expected initial scale?',
            options: ['Hobby / Prototype', 'Startup MVP (<10k users)', 'High-Growth Enterprise'],
          },
          {
            id: 'team',
            question: 'What is the development team size?',
            options: ['Solo Developer', 'Small Team (2-5)', 'Large Engineering Team'],
          },
          {
            id: 'timeline',
            question: 'What is your target delivery timeline?',
            options: ['Weekend Sprint', 'MVP in 2-4 Weeks', 'Production Hardened (2-3 Months)'],
          },
          {
            id: 'monetization',
            question: 'What is the planned business model?',
            options: ['Freemium + Stripe Tiers', 'Usage-Based API', 'Open Source / Free', 'B2B Enterprise'],
          },
        ],
      };
    }

    // Save questions and restated idea to project
    await prisma.project.update({
      where: { id: projectId },
      data: {
        restatedIdea: parsed.restated_idea,
        questions: JSON.stringify(parsed.questions),
      },
    });

    // Build Stage 1 content and persist to database and disk
    const initialStage1Json = JSON.stringify(
      {
        original_prompt: prompt,
        restated_idea: parsed.restated_idea,
        questions: parsed.questions,
      },
      null,
      2
    );

    const initialStage1Md =
      `# Requirement Extraction & Clarification\n\n` +
      `**Original Idea:**\n${prompt}\n\n` +
      `**Restated Technical Vision:**\n${parsed.restated_idea}\n\n` +
      `## Clarifying Questionnaire\n\n` +
      parsed.questions
        .map((q, i) => `### ${i + 1}. ${q.question}\n` + q.options.map((opt) => `- \`${opt}\``).join('\n'))
        .join('\n\n') +
      `\n\n## Specification Document (\`00_clarifications.json\`)\n\n\`\`\`json\n` +
      initialStage1Json +
      `\n\`\`\`\n`;

    await saveProjectArtifact(projectId, '00_clarifications.json', initialStage1Json);

    let stage1Record = await prisma.stage.findFirst({
      where: { projectId, stageNumber: 1 },
    });

    if (!stage1Record) {
      await prisma.stage.create({
        data: {
          projectId,
          stageNumber: 1,
          name: 'Requirement Extraction & Clarification',
          filename: '00_clarifications.json',
          contentMd: initialStage1Md,
          status: 'completed',
          durationMs: 1100,
          tokensUsed: 380,
        },
      });
    } else {
      await prisma.stage.update({
        where: { id: stage1Record.id },
        data: {
          contentMd: initialStage1Md,
          status: 'completed',
        },
      });
    }

    return parsed;
  }

  async runFullPipeline(
    projectId: string,
    apiKey?: string,
    customPrompts?: Record<number, string>,
    startStage: number = 2,
    baseUrl?: string
  ): Promise<void> {
    const stream = this.getStream(projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { stages: true },
    });

    if (!project) throw new Error(`Project ${projectId} not found`);

    this.pausedProjects.delete(projectId);

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'running' },
    });

    const answers: Record<string, string> = JSON.parse(project.clarifyingAnswers || '{}');
    const stageSummaries: Record<number, string> = {};

    // 1. If starting from the beginning (startStage <= 2), build and persist Stage 1 (00_clarifications.json)
    if (startStage <= 2) {
      const questionsList = project.questions ? JSON.parse(project.questions) : [];
      const stage1Json = JSON.stringify(
        {
          original_prompt: project.originalPrompt,
          restated_idea: project.restatedIdea || project.originalPrompt,
          clarifying_answers: answers,
          questions: questionsList,
        },
        null,
        2
      );

      const stage1Markdown =
        `# Requirement Extraction & Clarification\n\n` +
        `**Original Idea:**\n${project.originalPrompt}\n\n` +
        `**Restated Technical Vision:**\n${project.restatedIdea || project.originalPrompt}\n\n` +
        `## Clarifying Questionnaire & Decisions\n\n` +
        questionsList
          .map((q: any, i: number) => {
            const answer = answers[q.id] || 'Default / Standard';
            return (
              `### ${i + 1}. ${q.question}\n` +
              `**Selected Decision:** \`${answer}\`\n\n` +
              `*Available Options:*\n` +
              (q.options?.map((opt: string) => `- \`${opt}\``).join('\n') || '') +
              `\n`
            );
          })
          .join('\n') +
        `\n## Specification Document (\`00_clarifications.json\`)\n\n\`\`\`json\n` +
        stage1Json +
        `\n\`\`\`\n`;

      await saveProjectArtifact(projectId, '00_clarifications.json', stage1Json);

      let stage1 = await prisma.stage.findFirst({
        where: { projectId, stageNumber: 1 },
      });

      if (!stage1) {
        stage1 = await prisma.stage.create({
          data: {
            projectId,
            stageNumber: 1,
            name: 'Requirement Extraction & Clarification',
            filename: '00_clarifications.json',
            contentMd: stage1Markdown,
            status: 'completed',
            durationMs: 1100,
            tokensUsed: 380,
          },
        });
      } else {
        await prisma.stage.update({
          where: { id: stage1.id },
          data: {
            contentMd: stage1Markdown,
            status: 'completed',
          },
        });
      }

      // Immediately emit stage_complete for Stage 1 so live stepper marks it completed with green checkmark
      stream.emit('stage_complete', {
        stageNumber: 1,
        name: 'Requirement Extraction & Clarification',
        filename: '00_clarifications.json',
        contentMd: stage1Markdown,
        tokensUsed: 380,
        durationMs: 1100,
      });

      stageSummaries[1] = stage1Markdown.slice(0, 3500);
    }

    // Populate existing stage summaries for context injection
    for (const st of project.stages) {
      if (st.status === 'completed' && st.contentMd) {
        stageSummaries[st.stageNumber] = st.contentMd.slice(0, 3500);
      }
    }

    // Run stages sequentially from startStage through all defined stages
    const maxStageNumber = Math.max(...STAGE_DEFINITIONS.map((s) => s.stageNumber));
    for (let stageNum = startStage; stageNum <= maxStageNumber; stageNum++) {
      if (this.pausedProjects.has(projectId)) {
        await prisma.project.update({
          where: { id: projectId },
          data: { status: 'paused' },
        });
        stream.emit('pipeline_paused', { projectId, stageNumber: stageNum });
        return;
      }

      const stageDef = STAGE_DEFINITIONS.find((s) => s.stageNumber === stageNum);
      if (!stageDef) continue;

      // Adaptive pacing pause between stages to respect free tier rate limits
      // Demo mode: 0ms (instantaneous), Local LLM: 100ms, Remote APIs: 800ms
      if (stageNum > startStage) {
        const pacingTicks =
          project.provider === 'demo' ? 0 : project.provider === 'local_llm' ? 1 : 8;
        for (let i = 0; i < pacingTicks; i++) {
          if (this.pausedProjects.has(projectId)) {
            await prisma.project.update({
              where: { id: projectId },
              data: { status: 'paused' },
            });
            stream.emit('pipeline_paused', { projectId, stageNumber: stageNum });
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      const startTime = Date.now();
      this.activeStageNumbers.set(projectId, stageNum);
      stream.emit('stage_start', {
        stageNumber: stageNum,
        name: stageDef.name,
        filename: stageDef.filename,
      });

      // Upsert stage in DB as running
      let stageRecord = await prisma.stage.findFirst({
        where: { projectId, stageNumber: stageNum },
      });

      if (!stageRecord) {
        stageRecord = await prisma.stage.create({
          data: {
            projectId,
            stageNumber: stageNum,
            name: stageDef.name,
            filename: stageDef.filename,
            contentMd: '',
            status: 'running',
          },
        });
      } else {
        await prisma.stage.update({
          where: { id: stageRecord.id },
          data: { status: 'running' },
        });
      }

      try {
        // Build prompt context
        const promptContext = {
          user_prompt: project.originalPrompt,
          restated_idea: project.restatedIdea || project.originalPrompt,
          clarifying_answers: answers,
          summary_of_stage_2: stageSummaries[2],
          summary_of_stage_3: stageSummaries[3],
          summary_of_stage_4: stageSummaries[4],
          summary_of_stage_5: stageSummaries[5],
          summary_of_stage_6: stageSummaries[6],
          summary_of_stage_7: stageSummaries[7],
          summary_of_stage_8: stageSummaries[8],
          summary_of_stage_9: stageSummaries[9],
          summary_of_stage_10: stageSummaries[10],
          summary_all: Object.entries(stageSummaries)
            .map(([num, summ]) => `Stage ${num}: ${summ.slice(0, 600)}...`)
            .join('\n'),
        };

        const templateFn = STAGE_PROMPT_TEMPLATES[stageNum];
        const userMessageContent = customPrompts?.[stageNum] || (templateFn ? templateFn(promptContext) : '');

        const messages: ChatMessage[] = [
          { role: 'system', content: SHARED_SYSTEM_PROMPT },
          { role: 'user', content: userMessageContent },
        ];

        let accumulatedContent = '';
        let estimatedTokens = 0;

        const abortController = new AbortController();
        this.activeAbortControllers.set(projectId, abortController);

        const generator = generate({
          provider: project.provider as ProviderId,
          apiKey,
          baseUrl,
          model: project.model,
          messages,
          temperature: 0.7,
          stageNumber: stageNum,
          stageContext: stageSummaries,
          originalPrompt: project.originalPrompt,
          abortSignal: abortController.signal,
        });

        try {
          for await (const chunk of generator) {
            if (this.pausedProjects.has(projectId) || abortController.signal.aborted) {
              const durationMs = Date.now() - startTime;
              const formattedMarkdown = attachFrontmatter(accumulatedContent, {
                title: stageDef.name,
                project: project.title,
                generated_at: new Date().toISOString(),
                provider: project.provider,
                model: project.model,
                stage: stageNum,
              });

              if (accumulatedContent.trim().length > 0) {
                await saveProjectArtifact(projectId, stageDef.filename, formattedMarkdown);
              }

              await prisma.stage.update({
                where: { id: stageRecord.id },
                data: {
                  contentMd: formattedMarkdown,
                  status: 'paused',
                  durationMs,
                  tokensUsed: estimatedTokens,
                },
              });

              await prisma.project.update({
                where: { id: projectId },
                data: { status: 'paused' },
              });

              stream.emit('pipeline_paused', { projectId, stageNumber: stageNum });
              return;
            }

            accumulatedContent += chunk;
            estimatedTokens += Math.ceil(chunk.length / 4);
            stream.emit('token_delta', { stageNumber: stageNum, delta: chunk });
          }
        } catch (streamErr: any) {
          if (
            this.pausedProjects.has(projectId) ||
            abortController.signal.aborted ||
            streamErr.name === 'AbortError' ||
            streamErr.message?.toLowerCase().includes('abort')
          ) {
            const durationMs = Date.now() - startTime;
            const formattedMarkdown = attachFrontmatter(accumulatedContent, {
              title: stageDef.name,
              project: project.title,
              generated_at: new Date().toISOString(),
              provider: project.provider,
              model: project.model,
              stage: stageNum,
            });

            if (accumulatedContent.trim().length > 0) {
              await saveProjectArtifact(projectId, stageDef.filename, formattedMarkdown);
            }

            await prisma.stage.update({
              where: { id: stageRecord.id },
              data: {
                contentMd: formattedMarkdown,
                status: 'paused',
                durationMs,
                tokensUsed: estimatedTokens,
              },
            });

            await prisma.project.update({
              where: { id: projectId },
              data: { status: 'paused' },
            });

            stream.emit('pipeline_paused', { projectId, stageNumber: stageNum });
            return;
          }
          throw streamErr;
        } finally {
          this.activeAbortControllers.delete(projectId);
          this.activeStageNumbers.delete(projectId);
        }

        const durationMs = Date.now() - startTime;

        // Frontmatter and file persistence
        const formattedMarkdown = attachFrontmatter(accumulatedContent, {
          title: stageDef.name,
          project: project.title,
          generated_at: new Date().toISOString(),
          provider: project.provider,
          model: project.model,
          stage: stageNum,
        });

        await saveProjectArtifact(projectId, stageDef.filename, formattedMarkdown);

        // Update stage in database
        await prisma.stage.update({
          where: { id: stageRecord.id },
          data: {
            contentMd: formattedMarkdown,
            status: 'completed',
            durationMs,
            tokensUsed: estimatedTokens,
          },
        });

        stageSummaries[stageNum] = accumulatedContent.slice(0, 3500);

        stream.emit('stage_complete', {
          stageNumber: stageNum,
          name: stageDef.name,
          filename: stageDef.filename,
          contentMd: formattedMarkdown,
          tokensUsed: estimatedTokens,
          durationMs,
        });
      } catch (err: any) {
        console.error(`Error in stage ${stageNum}:`, err);
        await prisma.stage.update({
          where: { id: stageRecord.id },
          data: { status: 'failed' },
        });
        await prisma.project.update({
          where: { id: projectId },
          data: { status: 'failed' },
        });
        stream.emit('error', {
          stageNumber: stageNum,
          error: err.message || 'Stage execution failed',
        });
        throw err;
      }
    }

    // All stages complete: Compile PDF and package ZIP
    await this.compileArtifacts(projectId);

    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'completed',
        pdfUrl: `/api/projects/${projectId}/download/pdf`,
        zipUrl: `/api/projects/${projectId}/download/zip`,
      },
    });

    stream.emit('pipeline_complete', {
      projectId,
      status: 'completed',
      pdfUrl: `/api/projects/${projectId}/download/pdf`,
      zipUrl: `/api/projects/${projectId}/download/zip`,
    });
  }

  async regenerateStage(
    projectId: string,
    stageNumber: number,
    apiKey?: string,
    customPrompt?: string,
    baseUrl?: string
  ): Promise<void> {
    const stream = this.getStream(projectId);
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { stages: true },
    });

    if (!project) throw new Error(`Project ${projectId} not found`);

    const stageDef = STAGE_DEFINITIONS.find((s) => s.stageNumber === stageNumber);
    if (!stageDef) throw new Error(`Invalid stage number ${stageNumber}`);

    stream.emit('stage_start', {
      stageNumber,
      name: stageDef.name,
      filename: stageDef.filename,
    });

    const startTime = Date.now();
    const answers: Record<string, string> = JSON.parse(project.clarifyingAnswers || '{}');
    const stageSummaries: Record<number, string> = {};
    for (const st of project.stages) {
      if (st.stageNumber !== stageNumber && st.status === 'completed' && st.contentMd) {
        stageSummaries[st.stageNumber] = st.contentMd.slice(0, 3500);
      }
    }

    const promptContext = {
      user_prompt: project.originalPrompt,
      restated_idea: project.restatedIdea || project.originalPrompt,
      clarifying_answers: answers,
      summary_of_stage_2: stageSummaries[2],
      summary_of_stage_3: stageSummaries[3],
      summary_of_stage_4: stageSummaries[4],
      summary_of_stage_5: stageSummaries[5],
      summary_of_stage_6: stageSummaries[6],
      summary_of_stage_7: stageSummaries[7],
      summary_of_stage_8: stageSummaries[8],
      summary_of_stage_9: stageSummaries[9],
      summary_of_stage_10: stageSummaries[10],
      summary_all: Object.entries(stageSummaries)
        .map(([num, summ]) => `Stage ${num}: ${summ.slice(0, 600)}...`)
        .join('\n'),
    };

    const templateFn = STAGE_PROMPT_TEMPLATES[stageNumber];
    const userMessageContent = customPrompt || (templateFn ? templateFn(promptContext) : '');

    const messages: ChatMessage[] = [
      { role: 'system', content: SHARED_SYSTEM_PROMPT },
      { role: 'user', content: userMessageContent },
    ];

    let accumulatedContent = '';
    let estimatedTokens = 0;

    const generator = generate({
      provider: project.provider as ProviderId,
      apiKey,
      baseUrl,
      model: project.model,
      messages,
      temperature: 0.7,
      stageNumber,
      stageContext: stageSummaries,
      originalPrompt: project.originalPrompt,
    });

    for await (const chunk of generator) {
      accumulatedContent += chunk;
      estimatedTokens += Math.ceil(chunk.length / 4);
      stream.emit('token_delta', { stageNumber, delta: chunk });
    }

    const durationMs = Date.now() - startTime;
    const formattedMarkdown = attachFrontmatter(accumulatedContent, {
      title: stageDef.name,
      project: project.title,
      generated_at: new Date().toISOString(),
      provider: project.provider,
      model: project.model,
      stage: stageNumber,
    });

    await saveProjectArtifact(projectId, stageDef.filename, formattedMarkdown);

    const existingStage = await prisma.stage.findFirst({
      where: { projectId, stageNumber },
    });

    if (existingStage) {
      await prisma.stage.update({
        where: { id: existingStage.id },
        data: {
          contentMd: formattedMarkdown,
          status: 'completed',
          durationMs,
          tokensUsed: estimatedTokens,
        },
      });
    }

    stream.emit('stage_complete', {
      stageNumber,
      name: stageDef.name,
      filename: stageDef.filename,
      contentMd: formattedMarkdown,
      tokensUsed: estimatedTokens,
      durationMs,
    });

    // Recompile artifacts
    await this.compileArtifacts(projectId);
  }

  async compileArtifacts(projectId: string): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { stages: { orderBy: { stageNumber: 'asc' } } },
    });

    if (!project) return;

    const docs = project.stages
      .filter((s) => s.status === 'completed')
      .map((s) => ({
        stageNumber: s.stageNumber,
        filename: s.filename,
        name: s.name,
        content: s.contentMd,
      }));

    if (docs.length > 0) {
      await generateProjectPDF(
        {
          id: project.id,
          title: project.title,
          restatedIdea: project.restatedIdea || undefined,
          provider: project.provider,
          model: project.model,
          createdAt: project.createdAt,
        },
        docs
      );

      await packageProjectZip(project.id, project.title);
    }
  }
}

export const orchestrator = new PipelineOrchestrator();
