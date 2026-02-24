import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import { Skeleton, SkeletonGroup } from '../components/Skeleton';
import { FolderIcon, MessageIcon, ZapIcon, DollarIcon, ChevronRightIcon } from '../components/Icons';

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

function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <Skeleton variant="title" width="30%" />
      <Skeleton variant="text" width="50%" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-8">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="stat" />)}
      </div>
      <Skeleton variant="chart" />
      <div className="grid gap-3 mt-6">
        {[1, 2, 3].map(i => <Skeleton key={i} variant="card" height={72} />)}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: status } = useApi<Status>('/status');
  const { data: analytics } = useApi<Analytics>('/analytics');
  const { data: projects } = useApi<ProjectSummary[]>('/projects');

  if (!status) return <DashboardSkeleton />;

  const totalCost = analytics ? Object.values(analytics.costByModel).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Hero */}
      <div className="relative mb-8 overflow-hidden">
        {/* Background gradient blob */}
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full"
          style={{
            background: 'var(--gradient-hero)',
            opacity: 0.07,
            filter: 'blur(60px)',
          }}
        />
        <h1 className="text-3xl font-bold mb-1 text-gradient">Dashboard</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Your Claude Code history at a glance
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger-children">
        <StatCard
          label="Projects"
          value={status.projectCount}
          gradient="var(--gradient-stat-1)"
          icon={<FolderIcon size={20} />}
        />
        <StatCard
          label="Sessions"
          value={status.sessionCount}
          gradient="var(--gradient-stat-2)"
          icon={<MessageIcon size={20} />}
        />
        <StatCard
          label="Messages"
          value={status.messageCount}
          gradient="var(--gradient-stat-3)"
          icon={<ZapIcon size={20} />}
        />
        <StatCard
          label="Est. Cost"
          value={`$${totalCost.toFixed(2)}`}
          gradient="var(--gradient-stat-4)"
          icon={<DollarIcon size={20} />}
        />
      </div>

      {/* Activity chart */}
      {analytics?.dailyActivity && analytics.dailyActivity.length > 0 && (
        <ChartCard title="Daily Activity" subtitle="Messages per day" height={220}>
          <AreaChart data={analytics.dailyActivity}>
            <defs>
              <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 12,
                boxShadow: 'var(--shadow-md)',
              }}
            />
            <Area
              type="monotone"
              dataKey="messageCount"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#activityGrad)"
              name="Messages"
            />
          </AreaChart>
        </ChartCard>
      )}

      {/* Model usage table */}
      {analytics?.modelUsage && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Model Usage</h2>
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Model</th>
                  <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Input</th>
                  <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Output</th>
                  <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Cache</th>
                  <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analytics.modelUsage).map(([model, usage]) => (
                  <tr
                    key={model}
                    className="border-t"
                    style={{
                      borderColor: 'var(--color-border)',
                      transition: 'background-color var(--duration-fast) ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--color-text)' }}>{model}</td>
                    <td className="px-4 py-2.5 text-right" style={{ color: 'var(--color-text)' }}>{usage.inputTokens.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right" style={{ color: 'var(--color-text)' }}>{usage.outputTokens.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right" style={{ color: 'var(--color-text)' }}>{usage.cacheReadInputTokens.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-medium" style={{ color: 'var(--color-primary)' }}>
                      ${(analytics.costByModel[model] || 0).toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Projects */}
      <div>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Projects</h2>
        <div className="grid gap-3 stagger-children">
          {projects?.filter(p => p.sessionCount > 0).map(p => (
            <Link
              key={p.id}
              to={`/projects/${encodeURIComponent(p.id)}`}
              className="card group/proj"
            >
              <div className="p-4 flex items-center gap-3">
                <span style={{ color: 'var(--color-text-muted)' }}>
                  <FolderIcon size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium" style={{ color: 'var(--color-text)' }}>{p.name}</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {p.sessionCount} sessions &middot; {p.messageCount} messages
                  </div>
                </div>
                <span
                  className="opacity-0 group-hover/proj:opacity-100 flex-shrink-0"
                  style={{ color: 'var(--color-text-muted)', transition: 'opacity var(--duration-fast) ease' }}
                >
                  <ChevronRightIcon size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
