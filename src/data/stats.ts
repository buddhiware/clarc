import { STATS_FILE } from '../shared/paths';
import type { GlobalStats, Analytics } from '../shared/types';
import { estimateCost } from '../shared/pricing';

export async function readStatsCache(): Promise<GlobalStats> {
  const text = await Bun.file(STATS_FILE).text();
  return JSON.parse(text);
}

export function computeAnalytics(stats: GlobalStats): Analytics {
  // Cost by model
  const costByModel: Record<string, number> = {};
  for (const [model, usage] of Object.entries(stats.modelUsage)) {
    costByModel[model] = estimateCost(model, {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadInputTokens,
      cacheCreateTokens: usage.cacheCreationInputTokens,
    });
  }

  // Cost by day — estimate from daily model tokens
  const costByDay: { date: string; costUsd: number }[] = [];
  const tokensByDay: { date: string; input: number; output: number }[] = [];

  if (stats.dailyModelTokens) {
    for (const day of stats.dailyModelTokens) {
      let dayCost = 0;
      let dayInput = 0;
      let dayOutput = 0;

      for (const [model, tokens] of Object.entries(day.tokensByModel)) {
        // dailyModelTokens only has total tokens, not split by input/output
        // Estimate: assume 60% input, 40% output as rough split
        const inputEst = Math.round(tokens * 0.6);
        const outputEst = Math.round(tokens * 0.4);
        dayCost += estimateCost(model, {
          inputTokens: inputEst,
          outputTokens: outputEst,
          cacheReadTokens: 0,
          cacheCreateTokens: 0,
        });
        dayInput += inputEst;
        dayOutput += outputEst;
      }

      costByDay.push({ date: day.date, costUsd: dayCost });
      tokensByDay.push({ date: day.date, input: dayInput, output: dayOutput });
    }
  }

  // Activity heatmap from hourCounts
  const activityHeatmap: { day: number; hour: number; count: number }[] = [];
  for (const [hour, count] of Object.entries(stats.hourCounts)) {
    // hourCounts doesn't have day-of-week, so we distribute evenly
    // In a future version, compute this from actual session timestamps
    activityHeatmap.push({ day: 0, hour: parseInt(hour), count });
  }

  return {
    totalSessions: stats.totalSessions,
    totalMessages: stats.totalMessages,
    firstSessionDate: stats.firstSessionDate,
    dailyActivity: stats.dailyActivity,
    modelUsage: stats.modelUsage,
    hourCounts: stats.hourCounts,
    longestSession: stats.longestSession,
    costByDay,
    costByModel,
    costByProject: {},  // computed when we have project data
    tokensByDay,
    topProjects: [],    // populated by the API layer
    activityHeatmap,
  };
}
