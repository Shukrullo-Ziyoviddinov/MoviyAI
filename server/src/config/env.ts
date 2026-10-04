import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: required(
    'MONGODB_URI',
    'mongodb://127.0.0.1:27017/moviyai'
  ),
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  clientOrigin: process.env.CLIENT_ORIGIN || '*',
};
