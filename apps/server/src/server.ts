import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { config } from './config';
import { providersRouter } from './routes/providers';
import { projectsRouter } from './routes/projects';

const app = express();

// Ensure storage directory exists
if (!fs.existsSync(config.storageDir)) {
  fs.mkdirSync(config.storageDir, { recursive: true });
}

// Middleware
app.use(cors({ origin: true, credentials: true }));

// Lightweight GZIP compression middleware (bypasses SSE live event streams)
app.use((req, res, next) => {
  if (req.path.includes('/stream') || req.headers.accept?.includes('text/event-stream')) {
    return next();
  }
  const acceptEncoding = String(req.headers['accept-encoding'] || '');
  if (!acceptEncoding.includes('gzip')) {
    return next();
  }

  const originalSend = res.send;
  res.send = function (body: any): any {
    if (res.headersSent) return originalSend.call(this, body);

    const isBuffer = Buffer.isBuffer(body);
    const isString = typeof body === 'string';
    if (!isBuffer && !isString) {
      return originalSend.call(this, body);
    }

    const buf = isBuffer ? body : Buffer.from(body);
    if (buf.length < 1024) {
      return originalSend.call(this, body);
    }

    res.setHeader('Content-Encoding', 'gzip');
    res.removeHeader('Content-Length');
    zlib.gzip(buf, (err, compressed) => {
      if (err) {
        return originalSend.call(res, body);
      }
      originalSend.call(res, compressed);
    });
    return res;
  };
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file hosting for artifacts
app.use('/storage', express.static(config.storageDir));

// Routes
app.use('/api/providers', providersRouter);
app.use('/api/projects', projectsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Archly API Server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Global Express JSON Error Handler (Production Ready)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Archly API Server Error]:', err);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = typeof err.status === 'number' ? err.status : 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    statusCode,
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(config.port, () => {
  console.log(`🚀 Archly Server listening on http://localhost:${config.port}`);
  console.log(`📁 Artifact storage directory: ${config.storageDir}`);
});

const shutdown = () => {
  console.log('Shutting down Archly HTTP server...');
  server.close(() => {
    console.log('Archly HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (reason) => {
  console.error('[Archly Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Archly Uncaught Exception]:', err);
});
