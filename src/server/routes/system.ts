import { Hono } from 'hono';
import { getIndex, reindex } from '../../data/scanner';
import { SOURCE_DIR, CONFIG_DIR, DATA_DIR, PORT, SYNC_INTERVAL_MS } from '../../shared/paths';
import { getSyncStatus } from '../../data/sync';
import { runSync } from '../../data/sync';

const app = new Hono();

// GET /api/status — health, index stats, sync info
app.get('/status', async (c) => {
  const index = await getIndex();
  const sync = getSyncStatus();
  return c.json({
    status: 'ok',
    version: '0.2.0',
    sourceDir: SOURCE_DIR,
    dataDir: DATA_DIR,
    configDir: CONFIG_DIR,
    lastIndexedAt: index.lastIndexedAt,
    projectCount: index.projects.length,
    sessionCount: index.projects.reduce((sum, p) => sum + p.sessions.length, 0),
    agentCount: index.projects.reduce((sum, p) => sum + p.agents.length, 0),
    messageCount: index.projects.reduce((sum, p) => sum + p.messageCount, 0),
    hasStats: index.globalStats !== null,
    promptHistoryCount: index.promptHistory.length,
    sync: {
      lastSyncAt: sync.lastSyncAt,
      syncCount: sync.syncCount,
      totalFiles: sync.totalFiles,
      isSyncing: sync.isSyncing,
      errorCount: sync.errors.length,
    },
  });
});

// POST /api/reindex — sync + re-scan (pass ?sync=false to skip sync)
app.post('/reindex', async (c) => {
  const skipSync = c.req.query('sync') === 'false';
  if (!skipSync) {
    await runSync();
  }
  const index = await reindex();
  return c.json({
    status: 'reindexed',
    lastIndexedAt: index.lastIndexedAt,
    projectCount: index.projects.length,
  });
});

// GET /api/settings/info — runtime info for the settings page
app.get('/settings/info', (c) => {
  return c.json({
    sourceDir: SOURCE_DIR,
    dataDir: DATA_DIR,
    syncIntervalMs: SYNC_INTERVAL_MS,
    port: PORT,
    version: '0.2.0',
  });
});

export default app;
