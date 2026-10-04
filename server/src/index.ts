import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { connectDb } from './db/connect.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './utils/errorHandler.js';

async function bootstrap() {
  await connectDb();

  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'moviyai-server' });
  });

  app.use('/api', apiRoutes);

  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`MoviyAI server http://localhost:${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
