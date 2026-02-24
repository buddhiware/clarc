import { useApi } from '../hooks/useApi';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import { Skeleton } from '../components/Skeleton';
import { MessageIcon, ZapIcon, DollarIcon, FolderIcon } from '../components/Icons';

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

function AnalyticsSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <Skeleton variant="title" width="25%" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 mb-8">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="stat" />)}
      </div>
      <Skeleton variant="chart" />
      <div className="grid grid-cols-2 gap-4 mt-6">
        <Skeleton variant="chart" />
        <Skeleton variant="chart" />
      </div>
    </div>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--color-surface-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    fontSize: 12,
    boxShadow: 'var(--shadow-md)',
  },
};

export default function Analytics() {
  const { data, loading } = useApi<AnalyticsData>('/analytics');

  if (loading || !data) return <AnalyticsSkeleton />;

  const totalCost = Object.values(data.costByModel).reduce((a, b) => a + b, 0);
  const totalInput = Object.values(data.modelUsage).reduce((a, b) => a + b.inputTokens, 0);
  const totalOutput = Object.values(data.modelUsage).reduce((a, b) => a + b.outputTokens, 0);
  const totalCache = Object.values(data.modelUsage).reduce((a, b) => a + b.cacheReadInputTokens, 0);
  const cacheHitRate = totalInput > 0 ? (totalCache / (totalInput + totalCache)) * 100 : 0;

  // Prepare hour chart data
  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}:00`,
    count: data.hourCounts[String(h)] || 0,
  }));

  // Cost by model for horizontal bar chart
  const costModelData = Object.entries(data.costByModel).map(([model, cost]) => ({
    model: model.replace('claude-', '').split('-').slice(0, 2).join('-'),
    cost: parseFloat(cost.toFixed(4)),
  }));

  // Heatmap max
  const heatmapMax = Math.max(...data.activityHeatmap.map(h => h.count), 1);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gradient">Analytics</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 stagger-children">
        <StatCard label="Sessions" value={data.totalSessions} gradient="var(--gradient-stat-1)" icon={<FolderIcon size={20} />} />
        <StatCard label="Messages" value={data.totalMessages} gradient="var(--gradient-stat-2)" icon={<MessageIcon size={20} />} />
        <StatCard label="Input Tokens" value={formatTokens(totalInput)} gradient="var(--gradient-stat-3)" icon={<ZapIcon size={20} />} />
        <StatCard label="Output Tokens" value={formatTokens(totalOutput)} gradient="var(--gradient-stat-3)" icon={<ZapIcon size={20} />} />
        <StatCard label="Total Cost" value={`$${totalCost.toFixed(2)}`} gradient="var(--gradient-stat-4)" icon={<DollarIcon size={20} />} />
      </div>

      {/* Cost by model - horizontal bar chart */}
      <ChartCard title="Cost by Model" height={Math.max(costModelData.length * 40, 120)}>
        <BarChart data={costModelData} layout="vertical" margin={{ left: 80 }}>
          <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="model" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} width={80} />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey="cost" fill="var(--color-primary)" radius={[0, 4, 4, 0]} name="Cost ($)" />
        </BarChart>
      </ChartCard>

      {/* Cache efficiency with circular indicator */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Cache Efficiency</h2>
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-xl border"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          {/* Circular progress */}
          <div className="flex items-center justify-center">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-surface-2)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="var(--color-accent-emerald)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${cacheHitRate * 2.64} ${264 - cacheHitRate * 2.64}`}
                  style={{ transition: 'stroke-dasharray 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {cacheHitRate.toFixed(1)}%
                </span>
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>hit rate</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-2)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{formatTokens(totalCache)}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Cache Read Tokens</div>
          </div>
          <div className="flex flex-col justify-center p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-2)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{data.longestSession.messageCount} msgs</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Longest Session ({Math.round(data.longestSession.duration / 3600000)}h)
            </div>
          </div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Cost over time */}
        {data.costByDay.length > 0 && (
          <ChartCard title="Cost Over Time" height={200}>
            <AreaChart data={data.costByDay}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent-amber)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-accent-amber)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="costUsd" stroke="var(--color-accent-amber)" strokeWidth={2} fill="url(#costGrad)" name="Cost ($)" />
            </AreaChart>
          </ChartCard>
        )}

        {/* Token usage over time */}
        {data.tokensByDay.length > 0 && (
          <ChartCard title="Token Usage Over Time" height={200}>
            <AreaChart data={data.tokensByDay}>
              <defs>
                <linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent-emerald)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-accent-emerald)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} width={50} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="input" stroke="var(--color-primary)" strokeWidth={1.5} fill="url(#inputGrad)" name="Input" />
              <Area type="monotone" dataKey="output" stroke="var(--color-accent-emerald)" strokeWidth={1.5} fill="url(#outputGrad)" name="Output" />
            </AreaChart>
          </ChartCard>
        )}
      </div>

      {/* Activity by hour */}
      <ChartCard title="Activity by Hour" height={160}>
        <BarChart data={hourData}>
          <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} interval={2} />
          <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} width={30} />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey="count" fill="var(--color-primary)" radius={[3, 3, 0, 0]} name="Sessions" />
        </BarChart>
      </ChartCard>

      {/* Activity heatmap */}
      {data.activityHeatmap.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Activity Heatmap</h2>
          <div
            className="p-4 rounded-xl border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <div className="flex gap-1">
              {/* Day labels */}
              <div className="flex flex-col gap-1 mr-2 justify-between">
                {DAYS.map(d => (
                  <span key={d} className="text-[9px] h-3 leading-3 text-right" style={{ color: 'var(--color-text-muted)' }}>{d}</span>
                ))}
              </div>
              {/* Grid */}
              <div className="flex-1">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gridTemplateRows: 'repeat(7, 1fr)', gap: 2 }}>
                  {Array.from({ length: 7 }, (_, day) =>
                    Array.from({ length: 24 }, (_, hour) => {
                      const entry = data.activityHeatmap.find(h => h.day === day && h.hour === hour);
                      const count = entry?.count || 0;
                      const intensity = heatmapMax > 0 ? count / heatmapMax : 0;
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className="rounded-sm aspect-square"
                          title={`${DAYS[day]} ${hour}:00 — ${count} sessions`}
                          style={{
                            backgroundColor: count === 0
                              ? 'var(--color-surface-2)'
                              : `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`,
                            minHeight: 12,
                          }}
                        />
                      );
                    })
                  )}
                </div>
                {/* Hour labels */}
                <div className="flex justify-between mt-1">
                  {[0, 6, 12, 18, 23].map(h => (
                    <span key={h} className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{h}:00</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily activity table */}
      {data.dailyActivity.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Daily Activity</h2>
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Date</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Sessions</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Messages</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Tool Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyActivity.map((day, i) => (
                    <tr
                      key={day.date}
                      className="border-t"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--color-surface)',
                        transition: 'background-color var(--duration-fast) ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'transparent' : 'var(--color-surface)')}
                    >
                      <td className="px-4 py-2" style={{ color: 'var(--color-text)' }}>{day.date}</td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--color-text)' }}>{day.sessionCount}</td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--color-text)' }}>{day.messageCount}</td>
                      <td className="px-4 py-2 text-right" style={{ color: 'var(--color-text)' }}>{day.toolCallCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Top projects */}
      {data.topProjects.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Top Projects</h2>
          <div className="space-y-2 stagger-children">
            {data.topProjects.filter(p => p.sessions > 0).map(p => {
              const maxSessions = Math.max(...data.topProjects.map(pp => pp.sessions), 1);
              const barWidth = (p.sessions / maxSessions) * 100;
              return (
                <div
                  key={p.name}
                  className="relative p-3 rounded-xl overflow-hidden"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-xl"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: 'var(--color-primary)',
                      opacity: 0.08,
                    }}
                  />
                  <div className="relative flex items-center justify-between">
                    <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{p.name}</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {p.sessions} sessions &middot; {p.messages} msgs
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
