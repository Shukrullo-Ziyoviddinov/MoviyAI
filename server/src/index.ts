import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { attachTelegramBot, connectTelegramBot } from './bot.js';
import { env } from './config/env.js';
import { connectDb } from './db/connect.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './utils/errorHandler.js';

async function bootstrap() {
  await connectDb();

  const app = express();

  app.use(helmet());
  const clientOrigins = env.clientOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: clientOrigins.length > 1 ? clientOrigins : clientOrigins[0] || '*',
      credentials: true,
    })
  );
  app.use(compression());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  attachTelegramBot(app);
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
    void connectTelegramBot();
  });
}

bootstrap().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
