import { useApi } from '../hooks/useApi';

interface AnalyticsData {
  totalSessions: number;
  totalMessages: number;
  firstSessionDate: string;
  dailyActivity: { date: string; messageCount: number; sessionCount: number; toolCallCount: number }[];
  modelUsage: Record<string, { inputTokens: number; outputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number }>;
  hourCounts: Record<string, number>;
  longestSession: { sessionId: string; duration: number; messageCount: number };
  costByDay: { date: string; costUsd: number }[];
  costByModel: Record<string, number>;
  tokensByDay: { date: string; input: number; output: number }[];
  topProjects: { name: string; sessions: number; messages: number }[];
  activityHeatmap: { day: number; hour: number; count: number }[];
}

export default function Analytics() {
  const { data, loading } = useApi<AnalyticsData>('/analytics');

  if (loading || !data) {
    return <div className="p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading analytics...</div>;
  }

  const totalCost = Object.values(data.costByModel).reduce((a, b) => a + b, 0);
  const totalInput = Object.values(data.modelUsage).reduce((a, b) => a + b.inputTokens, 0);
  const totalOutput = Object.values(data.modelUsage).reduce((a, b) => a + b.outputTokens, 0);
  const totalCache = Object.values(data.modelUsage).reduce((a, b) => a + b.cacheReadInputTokens, 0);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>Analytics</h1>

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Sessions" value={data.totalSessions} />
        <StatCard label="Messages" value={data.totalMessages} />
        <StatCard label="Input Tokens" value={formatTokens(totalInput)} />
        <StatCard label="Output Tokens" value={formatTokens(totalOutput)} />
        <StatCard label="Total Cost" value={`$${totalCost.toFixed(2)}`} />
      </div>

      {/* Cost by model */}
      <Section title="Cost by Model">
        <div className="space-y-2">
          {Object.entries(data.costByModel).map(([model, cost]) => {
            const pct = totalCost > 0 ? (cost / totalCost) * 100 : 0;
            return (
              <div key={model} className="flex items-center gap-3">
                <div className="w-48 text-xs font-mono truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {model.replace('claude-', '')}
                </div>
                <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--color-primary)' }} />
                </div>
                <div className="text-sm font-medium w-20 text-right" style={{ color: 'var(--color-text)' }}>
                  ${cost.toFixed(4)}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Cache efficiency */}
      <Section title="Cache Efficiency">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-2)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {formatTokens(totalCache)}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Cache Read Tokens</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-2)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {totalInput > 0 ? ((totalCache / (totalInput + totalCache)) * 100).toFixed(1) : '0'}%
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Cache Hit Rate</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-2)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {data.longestSession.messageCount} msgs
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Longest Session ({Math.round(data.longestSession.duration / 3600000)}h)
            </div>
          </div>
        </div>
      </Section>

      {/* Activity by hour */}
      <Section title="Activity by Hour">
        <div className="flex gap-1 items-end h-24">
          {Array.from({ length: 24 }, (_, h) => {
            const count = data.hourCounts[String(h)] || 0;
            const maxCount = Math.max(...Object.values(data.hourCounts), 1);
            const height = (count / maxCount) * 100;
            return (
              <div key={h} className="flex-1 flex flex-col items-center justify-end" title={`${h}:00 — ${count} sessions`}>
                <div
                  className="w-full rounded-t min-h-[2px]"
                  style={{
                    height: `${Math.max(height, 2)}%`,
                    backgroundColor: count > 0 ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  }}
                />
                <span className="text-[9px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{h}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Daily activity table */}
      {data.dailyActivity.length > 0 && (
        <Section title="Daily Activity">
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <th className="text-left px-4 py-2" style={{ color: 'var(--color-text-muted)' }}>Date</th>
                  <th className="text-right px-4 py-2" style={{ color: 'var(--color-text-muted)' }}>Sessions</th>
                  <th className="text-right px-4 py-2" style={{ color: 'var(--color-text-muted)' }}>Messages</th>
                  <th className="text-right px-4 py-2" style={{ color: 'var(--color-text-muted)' }}>Tool Calls</th>
                </tr>
              </thead>
              <tbody>
                {data.dailyActivity.map(day => (
                  <tr key={day.date} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-2" style={{ color: 'var(--color-text)' }}>{day.date}</td>
                    <td className="px-4 py-2 text-right" style={{ color: 'var(--color-text)' }}>{day.sessionCount}</td>
                    <td className="px-4 py-2 text-right" style={{ color: 'var(--color-text)' }}>{day.messageCount}</td>
                    <td className="px-4 py-2 text-right" style={{ color: 'var(--color-text)' }}>{day.toolCallCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Top projects */}
      {data.topProjects.length > 0 && (
        <Section title="Top Projects">
          <div className="space-y-2">
            {data.topProjects.filter(p => p.sessions > 0).map(p => (
              <div key={p.name} className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'var(--color-surface)' }}>
                <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{p.name}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {p.sessions} sessions &middot; {p.messages} msgs
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>{title}</h2>
      <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <div className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
