import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

const CATEGORIES = ['accuracy', 'feature', 'bug', 'other'] as const;

const num = (v: unknown, lo: number, hi: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null;

function cleanPrediction(p: unknown) {
  if (!p || typeof p !== 'object') return null;
  const o = p as Record<string, unknown>;
  const i = (o.inputs ?? {}) as Record<string, unknown>;
  return {
    predictedWait: num(o.predictedWait, 0, 100000),
    likelyLow: num(o.likelyLow, 0, 100000),
    likelyHigh: num(o.likelyHigh, 0, 100000),
    baselineWait: num(o.baselineWait, 0, 100000),
    at: num(o.at, 0, 1e14),
    inputs: {
      currentBout: num(i.currentBout, 0, 100000),
      nextBout: num(i.nextBout, 0, 100000),
      activeMats: num(i.activeMats, 1, 100),
      avgBoutTime: num(i.avgBoutTime, 0.25, 60),
      expectedDelay: num(i.expectedDelay, 0, 1440),
      boutsAhead: num(i.boutsAhead, 0, 10000),
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Feedback storage is not set up yet. Try again later.' });
  }

  let body: Record<string, unknown> = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
  } catch {
    return res.status(400).json({ error: 'That request did not look right.' });
  }

  const category = CATEGORIES.find((c) => c === body.category);
  if (!category) return res.status(400).json({ error: 'Pick what your feedback is about.' });

  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
  const actualWait = num(body.actualWait, 0, 1440);
  if (!message && actualWait === null) {
    return res.status(400).json({ error: 'Add a note or the number of minutes you actually waited.' });
  }

  const createdAt = new Date();
  const id = `${createdAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id,
    createdAt: createdAt.toISOString(),
    category,
    message: message || null,
    actualWait,
    prediction: cleanPrediction(body.prediction),
    modelVersion: typeof body.modelVersion === 'string' ? body.modelVersion.slice(0, 40) : null,
  };

  try {
    await put(`feedback/${createdAt.toISOString().slice(0, 10)}/${id}.json`, JSON.stringify(record, null, 2), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
  } catch (err) {
    console.error('feedback write failed', err);
    return res.status(500).json({ error: 'Could not save right now. Try again in a minute.' });
  }

  return res.status(201).json({ ok: true });
}
