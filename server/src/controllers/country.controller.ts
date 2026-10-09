import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as countryService from '../services/country.service.js';

function readName(body: unknown) {
  if (!body || typeof body !== 'object') return '';
  const name = (body as { name?: unknown }).name;
  return typeof name === 'string' ? name.trim() : '';
}

function sendError(res: Response, error: unknown) {
  const status = (error as { status?: number }).status;
  if (status === 409) {
    res.status(409).json({ ok: false, error: 'Bu davlat allaqachon bor' });
    return;
  }
  throw error;
}

export async function listCountries(_req: Request, res: Response) {
  const docs = await countryService.getAllCountries();
  res.json({ ok: true, data: docs });
}

export async function createCountry(req: Request, res: Response) {
  const name = readName(req.body);
  if (!name) {
    res.status(400).json({ ok: false, error: 'Davlat nomi kerak' });
    return;
  }
  try {
    const doc = await countryService.createCountry(name);
    res.status(201).json({ ok: true, data: doc });
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateCountry(req: Request, res: Response) {
  const id = String(req.params.id ?? '');
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ ok: false, error: 'Davlat topilmadi' });
    return;
  }
  const name = readName(req.body);
  if (!name) {
    res.status(400).json({ ok: false, error: 'Davlat nomi kerak' });
    return;
  }
  try {
    const doc = await countryService.updateCountry(id, name);
    if (!doc) {
      res.status(404).json({ ok: false, error: 'Davlat topilmadi' });
      return;
    }
    res.json({ ok: true, data: doc });
  } catch (error) {
    sendError(res, error);
  }
}

export async function removeCountry(req: Request, res: Response) {
  const id = String(req.params.id ?? '');
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ ok: false, error: 'Davlat topilmadi' });
    return;
  }
  const doc = await countryService.deleteCountry(id);
  if (!doc) {
    res.status(404).json({ ok: false, error: 'Davlat topilmadi' });
    return;
  }
  res.json({ ok: true, data: doc });
}
