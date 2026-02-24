import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

interface Status {
  projectCount: number;
  sessionCount: number;
  agentCount: number;
  messageCount: number;
  hasStats: boolean;
  promptHistoryCount: number;
  lastIndexedAt: string;
}

interface Analytics {
  totalSessions: number;
  totalMessages: number;
  firstSessionDate: string;
  dailyActivity: { date: string; messageCount: number; sessionCount: number }[];
  modelUsage: Record<string, { inputTokens: number; outputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number }>;
  costByModel: Record<string, number>;
  topProjects: { name: string; sessions: number; messages: number }[];
}

interface ProjectSummary {
  id: string;
  name: string;
  sessionCount: number;
  lastActiveAt: string;
  messageCount: number;
}

export default function Dashboard() {
  const { data: status } = useApi<Status>('/status');
  const { data: analytics } = useApi<Analytics>('/analytics');
  const { data: projects } = useApi<ProjectSummary[]>('/projects');

  if (!status) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading...</div>
      </div>
    );
  }

  const totalCost = analytics ? Object.values(analytics.costByModel).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Dashboard</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Your Claude Code history at a glance
        </p>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Projects" value={status.projectCount} />
        <StatCard label="Sessions" value={status.sessionCount} />
        <StatCard label="Messages" value={status.messageCount} />
        <StatCard label="Est. Cost" value={`$${totalCost.toFixed(2)}`} />
      </div>

      {/* Model usage */}
      {analytics?.modelUsage && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Model Usage</h2>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <th className="text-left px-4 py-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>Model</th>
                  <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>Input Tokens</th>
                  <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>Output Tokens</th>
                  <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>Cache Read</th>
                  <th className="text-right px-4 py-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analytics.modelUsage).map(([model, usage]) => (
                  <tr key={model} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--color-text)' }}>{model}</td>
                    <td className="px-4 py-2 text-right" style={{ color: 'var(--color-text)' }}>{(usage.inputTokens).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right" style={{ color: 'var(--color-text)' }}>{(usage.outputTokens).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right" style={{ color: 'var(--color-text)' }}>{(usage.cacheReadInputTokens).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-medium" style={{ color: 'var(--color-primary)' }}>
                      ${(analytics.costByModel[model] || 0).toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activity */}
      {analytics?.dailyActivity && analytics.dailyActivity.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Daily Activity</h2>
          <div className="flex gap-1 items-end h-32 px-4 py-3 rounded-lg border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            {analytics.dailyActivity.map((day, i) => {
              const maxMsgs = Math.max(...analytics.dailyActivity.map(d => d.messageCount));
              const height = maxMsgs > 0 ? (day.messageCount / maxMsgs) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${day.date}: ${day.messageCount} msgs`}>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${Math.max(height, 2)}%`,
                      backgroundColor: 'var(--color-primary)',
                      opacity: 0.7 + (height / 100) * 0.3,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between px-4 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span>{analytics.dailyActivity[0]?.date}</span>
            <span>{analytics.dailyActivity[analytics.dailyActivity.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Recent projects */}
      <div>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Projects</h2>
        <div className="grid gap-3">
          {projects?.filter(p => p.sessionCount > 0).map(p => (
            <Link
              key={p.id}
              to={`/projects/${encodeURIComponent(p.id)}`}
              className="block p-4 rounded-lg border transition-colors hover:border-[var(--color-primary)]"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium" style={{ color: 'var(--color-text)' }}>{p.name}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {p.sessionCount} sessions
                </div>
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {p.messageCount} messages
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}
