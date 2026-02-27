import { Hono } from 'hono';
import { getIndex, reindex } from '../../data/scanner';
import { SOURCE_DIR, SOURCE_DIRS, CONFIG_DIR, DATA_DIR, PORT, SYNC_INTERVAL_MS, CONFIG_FILE } from '../../shared/paths';
import { readConfig, writeConfig, validateConfig, type ClarcConfig } from '../../shared/config';
import { getSyncStatus } from '../../data/sync';
import { runSync } from '../../data/sync';
import { restartPeriodicSync } from '../../data/sync-scheduler';
import { isWSL, detectWindowsClaudeDirs } from '../../shared/wsl-detect';

const app = new Hono();

// GET /api/status — health, index stats, sync info
app.get('/status', async (c) => {
  const index = await getIndex();
  const sync = getSyncStatus();
  return c.json({
    status: 'ok',
    version: '0.2.0',
    sourceDir: SOURCE_DIR,
    sourceDirs: SOURCE_DIRS,
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
app.get('/settings/info', async (c) => {
  const configFile = await readConfig();

  return c.json({
    sourceDir: SOURCE_DIR,
    sourceDirs: SOURCE_DIRS,
    dataDir: DATA_DIR,
    syncIntervalMs: SYNC_INTERVAL_MS,
    port: PORT,
    version: '0.2.0',
    configFilePath: CONFIG_FILE,
    configFile,
    envOverrides: {
      sourceDir: !!process.env.CLARC_CLAUDE_DIR,
      dataDir: !!process.env.CLARC_DATA_DIR,
      port: !!process.env.CLARC_PORT,
      syncIntervalMs: !!process.env.CLARC_SYNC_INTERVAL_MS,
    },
  });
});

// POST /api/settings/config — validate and save clarc.json
app.post('/settings/config', async (c) => {
  const body = await c.req.json<Record<string, any>>();
  const existing = await readConfig();

  // Merge: explicit null removes the field (reverts to default)
  const merged: ClarcConfig = { ...existing };
  if ('sourceDirs' in body) merged.sourceDirs = body.sourceDirs ?? undefined;
  if ('sourceDir' in body) merged.sourceDir = body.sourceDir ?? undefined;
  if ('dataDir' in body) merged.dataDir = body.dataDir ?? undefined;
  if ('port' in body) merged.port = body.port ?? undefined;
  if ('syncIntervalMs' in body) merged.syncIntervalMs = body.syncIntervalMs ?? undefined;
  if ('projectGroups' in body) merged.projectGroups = body.projectGroups ?? undefined;

  // If sourceDirs is set, clear legacy sourceDir to avoid confusion
  if (merged.sourceDirs && merged.sourceDirs.length > 0) {
    delete merged.sourceDir;
  }

  // Strip undefined values
  const clean: ClarcConfig = {};
  if (merged.sourceDirs !== undefined) clean.sourceDirs = merged.sourceDirs;
  if (merged.sourceDir !== undefined) clean.sourceDir = merged.sourceDir;
  if (merged.dataDir !== undefined) clean.dataDir = merged.dataDir;
  if (merged.port !== undefined) clean.port = merged.port;
  if (merged.syncIntervalMs !== undefined) clean.syncIntervalMs = merged.syncIntervalMs;
  if (merged.projectGroups !== undefined) clean.projectGroups = merged.projectGroups;

  // Validate
  const result = await validateConfig(clean);
  if (!result.valid) {
    return c.json({ saved: false, ...result }, 400);
  }

  // Write config to disk
  await writeConfig(clean);

  // Hot-reload sync interval if changed
  if ('syncIntervalMs' in body && clean.syncIntervalMs !== undefined) {
    restartPeriodicSync(clean.syncIntervalMs);
  }

  // Determine if a restart is needed (source dirs change requires restart)
  const restartRequired =
    ('sourceDirs' in body) ||
    ('sourceDir' in body && body.sourceDir !== (existing.sourceDir ?? null)) ||
    ('dataDir' in body && body.dataDir !== (existing.dataDir ?? null)) ||
    ('port' in body && body.port !== (existing.port ?? null)) ||
    ('projectGroups' in body);

  return c.json({ saved: true, config: clean, restartRequired, ...result });
});

// GET /api/settings/detect-sources — auto-detect available Claude directories
app.get('/settings/detect-sources', async (c) => {
  const detected = detectWindowsClaudeDirs();
  const current = SOURCE_DIRS;
  const suggestions = detected.filter(d => !current.includes(d));
  return c.json({ detected, suggestions, isWSL: isWSL() });
});

export default app;
