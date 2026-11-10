// POST /api/dd-start  { stage, runner, dev }  ->  { token }
// Issues a signed run ticket stamped with the SERVER's clock, so a finished run can be checked against real elapsed time.
import { ddStore, signTicket, newId, json, readJson, rateLimited, STAGES, RUNNERS } from '../lib/dd-shared.mjs';

export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const body = await readJson(req, 500);
  if (!body || !STAGES.includes(body.stage) || !RUNNERS.includes(body.runner) || typeof body.dev !== 'string' || !/^[a-f0-9]{64}$/.test(body.dev)) return json({ error: 'bad request' }, 400);
  const store = await ddStore();
  if (await rateLimited(store, req, context, 'start', 240)) return json({ error: 'slow down' }, 429);
  const token = signTicket({ rid: newId(), t: Date.now(), stage: body.stage, runner: body.runner, dev: body.dev });
  return json({ token });
};
