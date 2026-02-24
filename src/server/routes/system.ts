import { Hono } from 'hono';
import { getIndex, reindex } from '../../data/scanner';
import { CLAUDE_DIR, CONFIG_DIR } from '../../shared/paths';

const app = new Hono();

// GET /api/status — health, index stats
app.get('/status', async (c) => {
  const index = await getIndex();
  return c.json({
    status: 'ok',
    version: '0.1.0',
    claudeDir: CLAUDE_DIR,
    configDir: CONFIG_DIR,
    lastIndexedAt: index.lastIndexedAt,
    projectCount: index.projects.length,
    sessionCount: index.projects.reduce((sum, p) => sum + p.sessions.length, 0),
    agentCount: index.projects.reduce((sum, p) => sum + p.agents.length, 0),
    messageCount: index.projects.reduce((sum, p) => sum + p.messageCount, 0),
    hasStats: index.globalStats !== null,
    promptHistoryCount: index.promptHistory.length,
  });
});

// POST /api/reindex — trigger re-scan
app.post('/reindex', async (c) => {
  const index = await reindex();
  return c.json({
    status: 'reindexed',
    lastIndexedAt: index.lastIndexedAt,
    projectCount: index.projects.length,
  });
});

export default app;
