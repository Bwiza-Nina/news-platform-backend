import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { connectDatabase } from './src/config/database';
import { connectRedis } from './src/config/redis';
import { swaggerSpec } from './src/config/swagger';
import { startAnalyticsWorker } from './src/jobs/analytics.queue';
import { startAnalyticsCron } from './src/jobs/analytics.cron';
import { errorHandler, notFoundHandler } from './src/middleware/error.middleware';
import { logger } from './src/utils/logger';

import authRoutes from './src/routes/auth.routes';
import articleRoutes from './src/routes/article.routes';
import authorRoutes from './src/routes/author.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security & Core Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ─── Swagger Documentation ────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'News API – Eskalate Assessment',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    Success: true,
    Message: 'News API is running',
    Object: {
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
    Errors: null,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/author', authorRoutes);

// ─── 404 & Error Handlers ─────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const bootstrap = async () => {
  try {
    await connectDatabase();
    await connectRedis();

    // Start analytics background worker
    if (process.env.NODE_ENV !== 'test') {
      startAnalyticsWorker();
      startAnalyticsCron();
    }

    app.listen(PORT, () => {
      logger.info(`🚀 News API running on http://localhost:${PORT}`);
      logger.info(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Only start the server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export { app };