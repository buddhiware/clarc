// Pricing per million tokens (USD)
// Users can override via config
export interface ModelPricing {
  input: number;      // $ per MTok
  output: number;     // $ per MTok
  cacheRead: number;  // $ per MTok (typically 10% of input)
  cacheCreate: number; // $ per MTok (typically 25% of input)
}

export const DEFAULT_PRICING: Record<string, ModelPricing> = {
  // Sonnet family
  'claude-sonnet-4-20250514': { input: 3, output: 15, cacheRead: 0.3, cacheCreate: 0.75 },
  // Opus family
  'claude-opus-4-5-20251101': { input: 15, output: 75, cacheRead: 1.5, cacheCreate: 3.75 },
  'claude-opus-4-6': { input: 15, output: 75, cacheRead: 1.5, cacheCreate: 3.75 },
  // Haiku family
  'claude-haiku-4-5-20251001': { input: 0.25, output: 1.25, cacheRead: 0.025, cacheCreate: 0.0625 },
};

export function getPricing(model: string): ModelPricing {
  // Exact match first
  if (DEFAULT_PRICING[model]) return DEFAULT_PRICING[model];

  // Fuzzy match by family
  const lower = model.toLowerCase();
  if (lower.includes('opus')) return DEFAULT_PRICING['claude-opus-4-5-20251101'];
  if (lower.includes('sonnet')) return DEFAULT_PRICING['claude-sonnet-4-20250514'];
  if (lower.includes('haiku')) return DEFAULT_PRICING['claude-haiku-4-5-20251001'];

  // Default to sonnet pricing
  return DEFAULT_PRICING['claude-sonnet-4-20250514'];
}

export function estimateCost(
  model: string,
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreateTokens: number }
): number {
  const p = getPricing(model);
  return (
    (usage.inputTokens / 1_000_000) * p.input +
    (usage.outputTokens / 1_000_000) * p.output +
    (usage.cacheReadTokens / 1_000_000) * p.cacheRead +
    (usage.cacheCreateTokens / 1_000_000) * p.cacheCreate
  );
}
