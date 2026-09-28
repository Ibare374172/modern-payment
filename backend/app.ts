import express, { Express } from 'express';
import { stkRouter } from './routes/stkRoutes';
import { darajaRouter } from './routes/darajaRoutes';
import { postgresRouter } from './routes/postgresRoutes';
import { errorHandler, requestLogger } from './middleware/errorHandler';

/**
 * Creates and configures the Express backend app with all API routes.
 */
export function createBackendApp(): Express {
  const app = express();

  // Standard middleware
  app.use(express.json());
  app.use(requestLogger);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'UP',
      service: 'Zawadi Mart Mobile Payment & Daraja Gateway API',
      postgres: 'Active (Drizzle ORM + Real-time SSE Stream)',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API modules
  app.use('/api/stkpush', stkRouter);
  app.use('/api/daraja', darajaRouter);
  app.use('/api/postgres', postgresRouter);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
