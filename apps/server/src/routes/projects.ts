import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db/client';
import { orchestrator } from '../pipeline/orchestrator';
import { config } from '../config';
import {
  CreateProjectRequest,
  SubmitAnswersRequest,
  RegenerateStageRequest,
  ProviderId,
  STAGE_DEFINITIONS,
} from '@archly/shared-types';
import { generateSingleDocumentPDF } from '../generators/pdfRenderer';

export const projectsRouter = Router();

// GET /api/projects - list project history
projectsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        originalPrompt: true,
        restatedIdea: true,
        provider: true,
        model: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        pdfUrl: true,
        zipUrl: true,
        stages: {
          select: {
            stageNumber: true,
            status: true,
          },
        },
      },
    });

    const mapped = projects.map((p) => ({
      id: p.id,
      title: p.title,
      originalPrompt: p.originalPrompt,
      restatedIdea: p.restatedIdea,
      provider: p.provider,
      model: p.model,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      pdfUrl: p.pdfUrl,
      zipUrl: p.zipUrl,
      stagesCount: p.stages.length,
      completedStagesCount: p.stages.filter((s) => s.status === 'completed').length,
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects - create project and run Stage 1
projectsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { prompt, provider = 'demo', model, apiKey, baseUrl, customPrompts } = req.body as CreateProjectRequest;

    if (!prompt || prompt.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide a project idea (minimum 5 characters).' });
    }

    const titleCandidate = prompt.slice(0, 60).replace(/[\r\n]+/g, ' ').trim();
    const title = titleCandidate.length > 50 ? `${titleCandidate.slice(0, 47)}...` : titleCandidate;

    const chosenModel = model || (provider === 'demo' ? 'demo-blueprint-engine-v1' : 'openrouter/free');

    const project = await prisma.project.create({
      data: {
        title,
        originalPrompt: prompt.trim(),
        provider,
        model: chosenModel,
        status: 'pending',
      },
    });

    // Run Stage 1 (Extract brief and 5 clarifying questions)
    const stage1Result = await orchestrator.runStage1(
      project.id,
      prompt.trim(),
      provider as ProviderId,
      chosenModel,
      apiKey,
      customPrompts?.[1],
      baseUrl
    );

    res.status(201).json({
      projectId: project.id,
      restatedIdea: stage1Result.restated_idea,
      questions: stage1Result.questions,
    });
  } catch (err: any) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: err.message || 'Failed to create project' });
  }
});

// POST /api/projects/:id/answers - submit clarifying answers and start full pipeline
projectsRouter.post('/:id/answers', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const { answers, apiKey, baseUrl, customPrompts } = req.body as SubmitAnswersRequest;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await prisma.project.update({
      where: { id: projectId },
      data: {
        clarifyingAnswers: JSON.stringify(answers || {}),
        status: 'running',
      },
    });

    // Trigger full pipeline execution in background
    orchestrator.runFullPipeline(projectId, apiKey, customPrompts, 2, baseUrl).catch((err) => {
      console.error(`Pipeline run error on project ${projectId}:`, err);
    });

    res.json({ status: 'running', projectId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/stream - Server-Sent Events stream
projectsRouter.get('/:id/stream', (req: Request, res: Response) => {
  const projectId = req.params.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Initial connection ping
  res.write(`event: connected\ndata: ${JSON.stringify({ projectId })}\n\n`);

  const stream = orchestrator.getStream(projectId);

  const onStageStart = (data: any) => {
    res.write(`event: stage_start\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onTokenDelta = (data: any) => {
    res.write(`event: token_delta\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onStageComplete = (data: any) => {
    res.write(`event: stage_complete\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onPipelineComplete = (data: any) => {
    res.write(`event: pipeline_complete\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onError = (data: any) => {
    res.write(`event: error\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onPipelinePaused = (data: any) => {
    res.write(`event: pipeline_paused\ndata: ${JSON.stringify(data)}\n\n`);
  };

  stream.on('stage_start', onStageStart);
  stream.on('token_delta', onTokenDelta);
  stream.on('stage_complete', onStageComplete);
  stream.on('pipeline_complete', onPipelineComplete);
  stream.on('pipeline_paused', onPipelinePaused);
  stream.on('error', onError);

  req.on('close', () => {
    stream.off('stage_start', onStageStart);
    stream.off('token_delta', onTokenDelta);
    stream.off('stage_complete', onStageComplete);
    stream.off('pipeline_complete', onPipelineComplete);
    stream.off('pipeline_paused', onPipelinePaused);
    stream.off('error', onError);
  });
});

// GET /api/projects/:id - fetch project details and stage documents
projectsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        stages: {
          orderBy: { stageNumber: 'asc' },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let stages = project.stages;
    const hasStage1 = stages.some((s) => s.stageNumber === 1);

    // Auto-backfill Stage 1 if missing for completed project
    if (!hasStage1 && project.restatedIdea && project.questions) {
      const answers: Record<string, string> = JSON.parse(project.clarifyingAnswers || '{}');
      const questionsList = JSON.parse(project.questions);
      const stage1Json = JSON.stringify(
        {
          original_prompt: project.originalPrompt,
          restated_idea: project.restatedIdea,
          clarifying_answers: answers,
          questions: questionsList,
        },
        null,
        2
      );

      const stage1Markdown =
        `# Requirement Extraction & Clarification\n\n` +
        `**Original Idea:**\n${project.originalPrompt}\n\n` +
        `**Restated Technical Vision:**\n${project.restatedIdea}\n\n` +
        `## Clarifying Questionnaire & Decisions\n\n` +
        questionsList
          .map((q: any, i: number) => {
            const answer = answers[q.id] || 'Standard / Default';
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

      const projectDir = path.join(config.storageDir, 'projects', project.id);
      if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, '00_clarifications.json'), stage1Json, 'utf-8');

      const createdStage1 = await prisma.stage.create({
        data: {
          projectId: project.id,
          stageNumber: 1,
          name: 'Requirement Extraction & Clarification',
          filename: '00_clarifications.json',
          contentMd: stage1Markdown,
          status: 'completed',
          durationMs: 1100,
          tokensUsed: 380,
        },
      });

      stages = [createdStage1, ...stages].sort((a, b) => a.stageNumber - b.stageNumber);
    }

    res.json({
      ...project,
      stages,
      clarifyingAnswers: JSON.parse(project.clarifyingAnswers || '{}'),
      questions: project.questions ? JSON.parse(project.questions) : [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/stages/:stageNum/regenerate - re-run a single stage
projectsRouter.post('/:id/stages/:stageNum/regenerate', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const stageNum = parseInt(req.params.stageNum, 10);
    const { apiKey, baseUrl, customPrompt } = req.body as RegenerateStageRequest;

    if (isNaN(stageNum) || stageNum < 1 || stageNum > STAGE_DEFINITIONS.length) {
      return res.status(400).json({ error: 'Invalid stage number for regeneration' });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (stageNum === 1) {
      orchestrator.runStage1(projectId, project.originalPrompt, project.provider as any, project.model, apiKey, customPrompt, baseUrl).catch((err) => {
        console.error('Error regenerating stage 1:', err);
      });
    } else {
      orchestrator.regenerateStage(projectId, stageNum, apiKey, customPrompt, baseUrl).catch((err) => {
        console.error(`Error regenerating stage ${stageNum}:`, err);
      });
    }

    res.json({ status: 'regenerating', projectId, stageNumber: stageNum });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/pause - pause running pipeline
projectsRouter.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    orchestrator.pausePipeline(projectId);

    // Atomically transition running stages to paused in database
    await prisma.stage.updateMany({
      where: { projectId, status: 'running' },
      data: { status: 'paused' },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'paused' },
    });

    res.json({ status: 'paused', projectId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/skip - skip current or specified stage
projectsRouter.post('/:id/skip', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const { stageNumber } = req.body || {};
    const result = await orchestrator.skipStage(
      projectId,
      stageNumber ? parseInt(String(stageNumber), 10) : undefined
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/resume - resume execution from a failed or specific stage
projectsRouter.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const { fromStage, provider, model, apiKey, baseUrl, customPrompts } = req.body || {};

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { stages: { orderBy: { stageNumber: 'asc' } } },
    });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Determine which stage to resume from
    let resumeStage = fromStage ? parseInt(String(fromStage), 10) : undefined;
    if (!resumeStage || isNaN(resumeStage) || resumeStage < 2) {
      const pausedStage = project.stages.find((s) => s.status === 'paused');
      const failedStage = project.stages.find((s) => s.status === 'failed');
      if (pausedStage) {
        resumeStage = pausedStage.stageNumber;
      } else if (failedStage) {
        resumeStage = failedStage.stageNumber;
      } else {
        const completedStages = project.stages.filter((s) => s.status === 'completed');
        const maxCompleted = completedStages.reduce((max, s) => Math.max(max, s.stageNumber), 1);
        resumeStage = Math.min(maxCompleted + 1, STAGE_DEFINITIONS.length);
      }
    }

    // Update provider and/or model if user decided to switch models to recover from rate limits
    const updateData: any = { status: 'running' };
    if (provider) updateData.provider = provider;
    if (model) updateData.model = model;

    await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    // Run full pipeline asynchronously starting from resumeStage
    orchestrator.runFullPipeline(projectId, apiKey, customPrompts, resumeStage, baseUrl).catch((err) => {
      console.error(`Pipeline resume error on project ${projectId}:`, err);
    });

    res.json({
      status: 'resuming',
      projectId,
      fromStage: resumeStage,
      provider: provider || project.provider,
      model: model || project.model,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to generate clean, short, valid filename slugs
function getCleanSlug(title: string, maxLength = 32): string {
  const clean = (title || 'blueprint')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '');
  return clean || 'archly';
}

// GET /api/projects/:id/download/zip - download project ZIP bundle
projectsRouter.get('/:id/download/zip', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    let zipPath = path.join(config.storageDir, 'projects', projectId, `archly-architecture-${projectId}.zip`);
    const legacyZipPath = path.join(config.storageDir, 'projects', projectId, `project-blueprint-${projectId}.zip`);

    if (!fs.existsSync(zipPath) && fs.existsSync(legacyZipPath)) {
      zipPath = legacyZipPath;
    }

    if (!fs.existsSync(zipPath)) {
      // Package on demand if missing
      await orchestrator.compileArtifacts(projectId);
      if (!fs.existsSync(zipPath) && fs.existsSync(legacyZipPath)) {
        zipPath = legacyZipPath;
      }
    }

    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ error: 'ZIP file not generated yet' });
    }

    const cleanSlug = getCleanSlug(project.title);
    const downloadFilename = `archly-${cleanSlug}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
    res.download(zipPath, downloadFilename);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/download/pdf - download project merged PDF
projectsRouter.get('/:id/download/pdf', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    let pdfPath = path.join(config.storageDir, 'projects', projectId, `archly-architecture-${projectId}.pdf`);
    const legacyPdfPath = path.join(config.storageDir, 'projects', projectId, `project-blueprint-${projectId}.pdf`);

    if (!fs.existsSync(pdfPath) && fs.existsSync(legacyPdfPath)) {
      pdfPath = legacyPdfPath;
    }

    if (!fs.existsSync(pdfPath) || req.query.refresh === 'true') {
      // Recompile on demand if missing or requested refresh
      await orchestrator.compileArtifacts(projectId);
      if (!fs.existsSync(pdfPath) && fs.existsSync(legacyPdfPath)) {
        pdfPath = legacyPdfPath;
      }
    }

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'PDF file not generated yet' });
    }

    const cleanSlug = getCleanSlug(project.title);
    const downloadFilename = `archly-${cleanSlug}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
    res.download(pdfPath, downloadFilename);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/download/html - download or view standalone HTML report
projectsRouter.get('/:id/download/html', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const htmlPath = path.join(config.storageDir, 'projects', projectId, `project-blueprint-${projectId}.html`);

    if (!fs.existsSync(htmlPath)) {
      await orchestrator.compileArtifacts(projectId);
    }

    if (!fs.existsSync(htmlPath)) {
      return res.status(404).json({ error: 'HTML report not generated yet' });
    }

    const cleanSlug = getCleanSlug(project.title);
    const downloadFilename = `archly-${cleanSlug}.html`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
    res.download(htmlPath, downloadFilename);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/download/file/:filename - download individual markdown or artifact file
projectsRouter.get('/:id/download/file/:filename', async (req: Request, res: Response) => {
  try {
    const { id, filename } = req.params;
    let safeFilename = path.basename(filename);
    const format = req.query.format as string;

    // Resolve source file if requested as .pdf directly
    let sourceFilename = safeFilename;
    if (safeFilename.endsWith('.pdf') && !safeFilename.startsWith('project-blueprint-')) {
      const baseNoExt = safeFilename.replace(/\.pdf$/i, '');
      const testMd = path.join(config.storageDir, 'projects', id, `${baseNoExt}.md`);
      const testJson = path.join(config.storageDir, 'projects', id, `${baseNoExt}.json`);
      if (!fs.existsSync(testMd) && fs.existsSync(testJson)) {
        sourceFilename = `${baseNoExt}.json`;
      } else {
        sourceFilename = `${baseNoExt}.md`;
      }
    }

    let filePath = path.join(config.storageDir, 'projects', id, sourceFilename);

    // If source file missing on disk, check if it's in the database Stage records
    if (!fs.existsSync(filePath)) {
      let stage = await prisma.stage.findFirst({
        where: { projectId: id, filename: sourceFilename },
      });
      if (!stage && sourceFilename.endsWith('.md')) {
        const jsonFallback = sourceFilename.replace(/\.md$/, '.json');
        const jsonStage = await prisma.stage.findFirst({
          where: { projectId: id, filename: jsonFallback },
        });
        if (jsonStage) {
          stage = jsonStage;
          sourceFilename = jsonFallback;
          filePath = path.join(config.storageDir, 'projects', id, sourceFilename);
        }
      }
      if (stage && stage.contentMd) {
        const projectDir = path.join(config.storageDir, 'projects', id);
        if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
        fs.writeFileSync(filePath, stage.contentMd, 'utf-8');
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `File ${sourceFilename} not found` });
    }

    // Support optional ?format=pdf to download single document as PDF
    if (format === 'pdf' || safeFilename.endsWith('.pdf')) {
      const pdfFilename = sourceFilename.replace(/\.(md|json)$/i, '') + '.pdf';
      const singleDocPdfPath = path.join(config.storageDir, 'projects', id, pdfFilename);

      const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
      const project = await prisma.project.findUnique({ where: { id } });
      const stage = await prisma.stage.findFirst({
        where: { projectId: id, filename: sourceFilename },
      });

      await generateSingleDocumentPDF(
        {
          id,
          title: project?.title || 'Project Blueprint',
          restatedIdea: project?.restatedIdea || undefined,
          provider: project?.provider || 'AI',
          model: project?.model || 'model',
          createdAt: project?.createdAt || new Date(),
        },
        {
          stageNumber: stage?.stageNumber || 1,
          filename: sourceFilename,
          name: stage?.name || sourceFilename,
          content: content || stage?.contentMd || '',
        },
        singleDocPdfPath
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
      return res.download(singleDocPdfPath, pdfFilename);
    }

    // Support optional ?format=txt to download as plain text
    let downloadFilename = safeFilename;

    if (format === 'txt' || req.query.as === 'txt') {
      downloadFilename = safeFilename.replace(/\.md$/i, '.txt');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    } else if (safeFilename.endsWith('.md')) {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    } else if (safeFilename.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (safeFilename.endsWith('.zip')) {
      res.setHeader('Content-Type', 'application/zip');
    } else if (safeFilename.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
    res.download(filePath, downloadFilename);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id - delete a project
projectsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    await prisma.project.delete({ where: { id: projectId } });

    // Clean up files on disk
    const projectDir = path.join(config.storageDir, 'projects', projectId);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects - clear all projects
projectsRouter.delete('/', async (req: Request, res: Response) => {
  try {
    await prisma.project.deleteMany({});

    // Clean up all projects on disk
    const projectsDir = path.join(config.storageDir, 'projects');
    if (fs.existsSync(projectsDir)) {
      fs.rmSync(projectsDir, { recursive: true, force: true });
      fs.mkdirSync(projectsDir, { recursive: true });
    }

    res.json({ success: true, message: 'All project history cleared' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
