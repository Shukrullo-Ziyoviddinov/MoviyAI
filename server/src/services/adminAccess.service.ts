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

export function signAdminSession() {
  return jwt.sign({ role: 'admin-gate' }, env.jwtSecret, { expiresIn: '30d' });
}

export function verifyAdminSession(token: string) {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { role?: string };
    return payload.role === 'admin-gate';
  } catch {
    return false;
  }
}
