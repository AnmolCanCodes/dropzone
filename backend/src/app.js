import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'dropzone-api',
    timestamp: new Date().toISOString(),
  });
});

app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);

  res.status(err.status ?? 500).json({
    error: {
      code: err.code ?? 'INTERNAL_SERVER_ERROR',
      message: env.NODE_ENV === 'production'
        ? 'An unexpected error occurred.'
        : err.message,
    },
  });
});