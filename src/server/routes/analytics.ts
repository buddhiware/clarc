import { Hono } from 'hono';
import { getIndex } from '../../data/scanner';
import { readStatsCache, computeAnalytics } from '../../data/stats';

const app = new Hono();

// GET /api/analytics — global analytics
app.get('/', async (c) => {
  try {
    const [stats, index] = await Promise.all([readStatsCache(), getIndex()]);
    const analytics = computeAnalytics(stats);

    // Populate top projects from index
    analytics.topProjects = index.projects.map(p => ({
      name: p.name,
      sessions: p.sessions.length,
      messages: p.messageCount,
      cost: 0, // would need per-project cost calculation
    })).sort((a, b) => b.sessions - a.sessions);

    return c.json(analytics);
  } catch (err) {
    return c.json({ error: 'Failed to load analytics', details: String(err) }, 500);
  }
});

// GET /api/analytics/model-usage
app.get('/model-usage', async (c) => {
  try {
    const stats = await readStatsCache();
    return c.json(stats.modelUsage);
  } catch {
    return c.json({});
  }
});

// GET /api/analytics/cost
app.get('/cost', async (c) => {
  try {
    const stats = await readStatsCache();
    const analytics = computeAnalytics(stats);
    return c.json({
      costByDay: analytics.costByDay,
      costByModel: analytics.costByModel,
    });
  } catch {
    return c.json({ costByDay: [], costByModel: {} });
  }
});

// GET /api/analytics/heatmap
app.get('/heatmap', async (c) => {
  try {
    const stats = await readStatsCache();
    const analytics = computeAnalytics(stats);
    return c.json(analytics.activityHeatmap);
  } catch {
    return c.json([]);
  }
});

export default app;
