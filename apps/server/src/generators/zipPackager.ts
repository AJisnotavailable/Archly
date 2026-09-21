import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { config } from '../config';

export async function packageProjectZip(projectId: string, projectTitle: string): Promise<string> {
  const projectDir = path.join(config.storageDir, 'projects', projectId);
  const zipPath = path.join(projectDir, `archly-architecture-${projectId}.zip`);
  const legacyZipPath = path.join(projectDir, `project-blueprint-${projectId}.zip`);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 6 }, // Optimal speed/compression ratio
    });

    output.on('close', () => {
      try {
        fs.copyFileSync(zipPath, legacyZipPath);
      } catch {}
      resolve(zipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Read all files in the project folder except existing zip archives
    const files = fs.readdirSync(projectDir);
    for (const file of files) {
      if (!file.endsWith('.zip')) {
        const filePath = path.join(projectDir, file);
        archive.file(filePath, { name: file });
      }
    }

    archive.finalize();
  });
}
