import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSessionMiddleware } from './config/session.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import apiRoutes from './routes/api.js';
import webhookRoutes from './routes/webhooks.js';
import widgetRoutes from './routes/widget.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true, port: process.env.PORT });
  });

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors({
    origin: true,
    credentials: true,
  }));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(getSessionMiddleware());

  app.use('/widget', widgetRoutes);
  app.use(express.static(publicDir));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'admin', 'index.html'));
  });

  app.get('/admin', (_req, res) => {
    res.sendFile(path.join(publicDir, 'admin', 'index.html'));
  });

  app.use('/auth', authRoutes);
  app.use('/admin/api', adminRoutes);
  app.use('/api', apiRoutes);
  app.use('/webhooks', webhookRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
