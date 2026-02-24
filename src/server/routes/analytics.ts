import { Hono } from 'hono';
import { getIndex } from '../../data/scanner';
import { readStatsCache, computeAnalytics } from '../../data/stats';

const app = new Hono();

// GET /api/analytics — global analytics
app.get('/', async (c) => {
  try {
    const [stats, index] = await Promise.all([readStatsCache(), getIndex()]);
    const analytics = computeAnalytics(stats);

    // Compute costs exclusively from indexed session data.
    // stats-cache.json is Claude Code's own tracking file and often covers
    // different sessions than what we've indexed, leading to mismatches.
    // We use session-derived data for ALL cost/token metrics.
    const costByModel: Record<string, number> = {};
    const modelUsage: Record<string, {
      inputTokens: number; outputTokens: number;
      cacheReadInputTokens: number; cacheCreationInputTokens: number;
      webSearchRequests: number; costUSD: number;
      contextWindow: number; maxOutputTokens: number;
    }> = {};

    for (const project of index.projects) {
      for (const session of project.sessions) {
        if (session.tokenUsage && session.model) {
          const model = session.model;
          const tu = session.tokenUsage;

          if (!modelUsage[model]) {
            modelUsage[model] = {
              inputTokens: 0, outputTokens: 0,
              cacheReadInputTokens: 0, cacheCreationInputTokens: 0,
              webSearchRequests: 0, costUSD: 0,
              contextWindow: 0, maxOutputTokens: 0,
            };
          }
          modelUsage[model].inputTokens += tu.inputTokens;
          modelUsage[model].outputTokens += tu.outputTokens;
          modelUsage[model].cacheReadInputTokens += tu.cacheReadTokens;
          modelUsage[model].cacheCreationInputTokens += tu.cacheCreateTokens;

          costByModel[model] = (costByModel[model] || 0) + (session.estimatedCostUsd || 0);
        }
      }
    }

    // Update costUSD in modelUsage
    for (const [model, cost] of Object.entries(costByModel)) {
      if (modelUsage[model]) modelUsage[model].costUSD = cost;
    }

    // Replace analytics cost/token data with session-derived data
    analytics.costByModel = costByModel;
    analytics.modelUsage = modelUsage;

    // Use indexed counts (more accurate than stats-cache)
    analytics.totalSessions = index.projects.reduce((sum, p) => sum + p.sessions.length, 0);
    analytics.totalMessages = index.projects.reduce((sum, p) => sum + p.messageCount, 0);

    // Compute dailyActivity and costByDay from session timestamps
    // (stats-cache.json dailyActivity is incomplete — often only a few days)
    const dailyMap: Record<string, { sessions: number; messages: number; cost: number }> = {};
    for (const project of index.projects) {
      for (const session of project.sessions) {
        const date = session.startedAt
          ? new Date(session.startedAt).toISOString().slice(0, 10)
          : new Date(session.modifiedAt).toISOString().slice(0, 10);
        if (!dailyMap[date]) dailyMap[date] = { sessions: 0, messages: 0, cost: 0 };
        dailyMap[date].sessions += 1;
        dailyMap[date].messages += session.messageCount || 0;
        dailyMap[date].cost += session.estimatedCostUsd || 0;
      }
    }
    analytics.dailyActivity = Object.entries(dailyMap)
      .map(([date, d]) => ({ date, messageCount: d.messages, sessionCount: d.sessions, toolCallCount: 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));
    analytics.costByDay = Object.entries(dailyMap)
      .map(([date, d]) => ({ date, costUsd: d.cost }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Populate top projects with cost
    analytics.topProjects = index.projects.map(p => {
      const projectCost = p.sessions.reduce((sum, s) => sum + (s.estimatedCostUsd || 0), 0);
      return {
        name: p.name,
        sessions: p.sessions.length,
        messages: p.messageCount,
        cost: projectCost,
      };
    }).sort((a, b) => b.sessions - a.sessions);

    return c.json(analytics);
  } catch (err) {
    return c.json({ error: 'Failed to load analytics', details: String(err) }, 500);
  }
});

// GET /api/analytics/model-usage
app.get('/model-usage', async (c) => {
  try {
    const index = await getIndex();
    const modelUsage: Record<string, any> = {};

    for (const project of index.projects) {
      for (const session of project.sessions) {
        if (session.tokenUsage && session.model) {
          const model = session.model;
          if (!modelUsage[model]) {
            modelUsage[model] = { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 };
          }
          modelUsage[model].inputTokens += session.tokenUsage.inputTokens;
          modelUsage[model].outputTokens += session.tokenUsage.outputTokens;
          modelUsage[model].cacheReadInputTokens += session.tokenUsage.cacheReadTokens;
          modelUsage[model].cacheCreationInputTokens += session.tokenUsage.cacheCreateTokens;
        }
      }
    }

    return c.json(modelUsage);
  } catch {
    return c.json({});
  }
});

// GET /api/analytics/cost
app.get('/cost', async (c) => {
  try {
    const index = await getIndex();

    // Session-derived cost by model and by day
    const costByModel: Record<string, number> = {};
    const costByDayMap: Record<string, number> = {};
    for (const project of index.projects) {
      for (const session of project.sessions) {
        if (session.model && session.estimatedCostUsd) {
          costByModel[session.model] = (costByModel[session.model] || 0) + session.estimatedCostUsd;
        }
        if (session.estimatedCostUsd) {
          const date = session.startedAt
            ? new Date(session.startedAt).toISOString().slice(0, 10)
            : new Date(session.modifiedAt).toISOString().slice(0, 10);
          costByDayMap[date] = (costByDayMap[date] || 0) + session.estimatedCostUsd;
        }
      }
    }

    const costByDay = Object.entries(costByDayMap)
      .map(([date, costUsd]) => ({ date, costUsd }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return c.json({ costByDay, costByModel });
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
