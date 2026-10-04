import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from '../config/env.js';

// Windowsda ba'zi DNS resolverlar mongodb+srv SRV so'rovini rad etadi
dns.setServers(['8.8.8.8', '1.1.1.1']);

export async function connectDb(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  await mongoose.connect(env.mongodbUri);
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
