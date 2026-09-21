import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

// Ensure database directory exists if using file path
try {
  const dbUrl = process.env.DATABASE_URL || config.databaseUrl || '';
  if (dbUrl.startsWith('file:')) {
    const rawPath = dbUrl.replace(/^file:/, '').split('?')[0];
    const resolvedPath = path.resolve(rawPath);
    const dbDir = path.dirname(resolvedPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }
} catch (e) {
  // Non-fatal if URL parsing is non-standard
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Configure SQLite WAL mode and busy_timeout for concurrency resilience
(async () => {
  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
  } catch (err) {
    // Non-fatal if database is initializing or read-only
  }
})();

