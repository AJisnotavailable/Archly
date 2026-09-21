import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';

export interface FrontmatterMetadata {
  title: string;
  project: string;
  generated_at: string;
  provider: string;
  model: string;
  stage: number;
}

export function cleanMarkdownContent(raw: string): string {
  let text = raw.trim();

  // Strip wrapping ```markdown ... ``` fences if the LLM output was wrapped in one
  if (text.startsWith('```markdown') && text.endsWith('```')) {
    text = text.slice(11, -3).trim();
  } else if (text.startsWith('```md') && text.endsWith('```')) {
    text = text.slice(5, -3).trim();
  }

  return text;
}

export function attachFrontmatter(content: string, meta: FrontmatterMetadata): string {
  const frontmatter = `---
title: "${meta.title.replace(/"/g, '\\"')}"
project: "${meta.project.replace(/"/g, '\\"')}"
generated_at: "${meta.generated_at}"
provider: "${meta.provider}"
model: "${meta.model}"
stage: ${meta.stage}
---

`;
  return frontmatter + cleanMarkdownContent(content);
}

export async function saveProjectArtifact(
  projectId: string,
  filename: string,
  content: string
): Promise<string> {
  const projectDir = path.join(config.storageDir, 'projects', projectId);
  await fs.mkdir(projectDir, { recursive: true });

  const filePath = path.join(projectDir, filename);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

export async function getProjectArtifacts(projectId: string): Promise<string[]> {
  const projectDir = path.join(config.storageDir, 'projects', projectId);
  try {
    const files = await fs.readdir(projectDir);
    return files.filter((f) => f.endsWith('.md') || f.endsWith('.pdf'));
  } catch {
    return [];
  }
}
