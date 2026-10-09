import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as genreService from '../services/genre.service.js';

function readPair(body: unknown) {
  if (!body || typeof body !== 'object') return { name: '', nameRu: '' };
  const record = body as { name?: unknown; nameRu?: unknown };
  return {
    name: typeof record.name === 'string' ? record.name.trim() : '',
    nameRu: typeof record.nameRu === 'string' ? record.nameRu.trim() : '',
  };
}

function sendError(res: Response, error: unknown) {
  const status = (error as { status?: number }).status;
  if (status === 409) {
    res.status(409).json({ ok: false, error: 'Bu janr allaqachon bor' });
    return;
  }
  throw error;
}

export async function listGenres(_req: Request, res: Response) {
  const docs = await genreService.getAllGenres();
  res.json({ ok: true, data: docs });
}

export async function createGenre(req: Request, res: Response) {
  const { name, nameRu } = readPair(req.body);
  if (!name || !nameRu) {
    res.status(400).json({ ok: false, error: 'O‘zbekcha va ruscha janr kerak' });
    return;
  }
  try {
    const doc = await genreService.createGenre(name, nameRu);
    res.status(201).json({ ok: true, data: doc });
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateGenre(req: Request, res: Response) {
  const id = String(req.params.id ?? '');
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ ok: false, error: 'Janr topilmadi' });
    return;
  }
  const { name, nameRu } = readPair(req.body);
  if (!name || !nameRu) {
    res.status(400).json({ ok: false, error: 'O‘zbekcha va ruscha janr kerak' });
    return;
  }
  try {
    const doc = await genreService.updateGenre(id, name, nameRu);
    if (!doc) {
      res.status(404).json({ ok: false, error: 'Janr topilmadi' });
      return;
    }
    res.json({ ok: true, data: doc });
  } catch (error) {
    sendError(res, error);
  }
}

export async function removeGenre(req: Request, res: Response) {
  const id = String(req.params.id ?? '');
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ ok: false, error: 'Janr topilmadi' });
    return;
  }
  const doc = await genreService.deleteGenre(id);
  if (!doc) {
    res.status(404).json({ ok: false, error: 'Janr topilmadi' });
    return;
  }
  res.json({ ok: true, data: doc });
}
