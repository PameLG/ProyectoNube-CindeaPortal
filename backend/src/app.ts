import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rate-limit.middleware';
import { authRouter } from './routes/auth.routes';
import { studentsRouter } from './routes/students.routes';
import { coursesRouter } from './routes/courses.routes';
import { gradesRouter } from './routes/grades.routes';
import { attendanceRouter } from './routes/attendance.routes';
import { integrationsRouter } from './routes/integrations.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '5mb' }));
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api', apiLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/students', studentsRouter);
  app.use('/api/courses', coursesRouter);
  app.use('/api', gradesRouter);
  app.use('/api', attendanceRouter);
  app.use('/api/integrations', integrationsRouter);

  app.use(errorMiddleware);
  return app;
}
