import { timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AdminAccount } from '../models/AdminAccount.js';

function passwordsMatch(input: string, expected: string) {
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function adminPasswordMatches(password: string) {
  if (!env.adminPassword) return false;
  return passwordsMatch(password, env.adminPassword);
}

export async function saveAdminAccount(name: string, phone: string) {
  const doc = await AdminAccount.create({ name, phone });
  return doc.toObject();
}

export function signAdminSession(name: string) {
  return jwt.sign({ role: 'admin-gate', name }, env.jwtSecret, { expiresIn: '30d' });
}

export function readAdminSession(token: string) {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { role?: string; name?: string };
    if (payload.role !== 'admin-gate') return null;
    return { name: String(payload.name ?? '').trim() };
  } catch {
    return null;
  }
}
