import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

interface ProjectSummary {
  id: string;
  name: string;
  sessionCount: number;
  lastActiveAt: string;
  messageCount: number;
}

export default function Sidebar({ onToggle }: { onToggle: () => void }) {
  const { data: projects } = useApi<ProjectSummary[]>('/projects');
  const [filter, setFilter] = useState('');
  const location = useLocation();

  const filtered = projects?.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
            clarc
          </Link>
          <button
            onClick={onToggle}
            className="text-sm px-2 py-1 rounded"
            style={{ color: 'var(--color-text-muted)' }}
            title="Hide sidebar"
          >
            &laquo;
          </button>
        </div>
        <input
          type="text"
          placeholder="Filter projects..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full px-3 py-1.5 rounded-md text-sm border outline-none"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="px-2 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {[
          { to: '/', label: 'Dashboard' },
          { to: '/analytics', label: 'Analytics' },
          { to: '/search', label: 'Search' },
          { to: '/tasks', label: 'Tasks' },
        ].map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="block px-3 py-1.5 rounded-md text-sm mb-0.5 transition-colors"
            style={{
              backgroundColor: location.pathname === to ? 'var(--color-surface-2)' : 'transparent',
              color: location.pathname === to ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="text-xs font-semibold uppercase px-3 py-1" style={{ color: 'var(--color-text-muted)' }}>
          Projects ({filtered.length})
        </div>
        {filtered.map(p => {
          const isActive = location.pathname.includes(p.id);
          return (
            <Link
              key={p.id}
              to={`/projects/${encodeURIComponent(p.id)}`}
              className="block px-3 py-2 rounded-md mb-0.5 transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--color-surface-2)' : 'transparent',
              }}
            >
              <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                {p.name}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {p.sessionCount} sessions &middot; {p.messageCount} msgs
                {p.lastActiveAt && p.lastActiveAt !== '1970-01-01T00:00:00.000Z' && (
                  <> &middot; {timeAgo(p.lastActiveAt)}</>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
