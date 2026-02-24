import { Hono } from 'hono';
import { runSync, getSyncStatus } from '../../data/sync';
import { reindex } from '../../data/scanner';

const app = new Hono();

// GET /api/sync/status — current sync state
app.get('/status', async (c) => {
  return c.json(getSyncStatus());
});

// POST /api/sync — trigger sync, then reindex
app.post('/', async (c) => {
  const syncStatus = await runSync();
  const index = await reindex();
  return c.json({
    sync: syncStatus,
    index: {
      lastIndexedAt: index.lastIndexedAt,
      projectCount: index.projects.length,
      sessionCount: index.projects.reduce((sum, p) => sum + p.sessions.length, 0),
    },
  });
});

export default app;
