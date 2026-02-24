import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { GridIcon, BarChartIcon, SearchIcon, CheckSquareIcon, HelpCircleIcon, FolderIcon, ChevronRightIcon, SidebarIcon } from './Icons';

interface ProjectSummary {
  id: string;
  name: string;
  sessionCount: number;
  lastActiveAt: string;
  messageCount: number;
}

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', Icon: GridIcon },
  { to: '/analytics', label: 'Analytics', Icon: BarChartIcon },
  { to: '/search', label: 'Search', Icon: SearchIcon },
  { to: '/tasks', label: 'Tasks', Icon: CheckSquareIcon },
];

export default function Sidebar({ onToggle }: { onToggle: () => void }) {
  const { data: projects } = useApi<ProjectSummary[]>('/projects');
  const [filter, setFilter] = useState('');
  const location = useLocation();

  const filtered = projects?.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  const isHelpActive = location.pathname === '/help';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="text-lg font-bold text-gradient">
            clarc
          </Link>
          <button
            onClick={onToggle}
            className="btn-ghost p-1.5 rounded-lg"
            title="Hide sidebar"
          >
            <SidebarIcon size={16} />
          </button>
        </div>
        <input
          type="text"
          placeholder="Filter projects..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            boxShadow: 'var(--shadow-inset)',
            transition: 'box-shadow var(--duration-fast) ease, border-color var(--duration-fast) ease',
          }}
          onFocus={e => {
            e.target.style.borderColor = 'var(--color-primary)';
            e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2), var(--shadow-inset)';
          }}
          onBlur={e => {
            e.target.style.borderColor = 'var(--color-border)';
            e.target.style.boxShadow = 'var(--shadow-inset)';
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="px-2 py-2 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5"
              style={{
                backgroundColor: isActive ? 'var(--color-surface-2)' : 'transparent',
                color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
                fontWeight: isActive ? 500 : 400,
                borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                transition: 'all var(--duration-fast) ease',
              }}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Project list — scrollable */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div
          className="text-xs font-semibold uppercase tracking-wider px-3 py-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Projects ({filtered.length})
        </div>
        {filtered.map(p => {
          const isActive = location.pathname.includes(p.id);
          return (
            <Link
              key={p.id}
              to={`/projects/${encodeURIComponent(p.id)}`}
              className="group/proj flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5"
              style={{
                backgroundColor: isActive ? 'var(--color-surface-2)' : 'transparent',
                transition: 'background-color var(--duration-fast) ease',
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface)';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                <FolderIcon size={14} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {p.name}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {p.sessionCount} sessions &middot; {p.messageCount} msgs
                  {p.lastActiveAt && p.lastActiveAt !== '1970-01-01T00:00:00.000Z' && (
                    <> &middot; {timeAgo(p.lastActiveAt)}</>
                  )}
                </div>
              </div>
              <span
                className="opacity-0 group-hover/proj:opacity-100 flex-shrink-0"
                style={{
                  color: 'var(--color-text-muted)',
                  transition: 'opacity var(--duration-fast) ease',
                }}
              >
                <ChevronRightIcon size={14} />
              </span>
            </Link>
          );
        })}
      </div>

      {/* Help link — pinned at bottom, always visible */}
      <div className="flex-shrink-0 border-t px-2 py-2" style={{ borderColor: 'var(--color-border)' }}>
        <Link
          to="/help"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: isHelpActive ? 'var(--color-surface-2)' : 'transparent',
            color: isHelpActive ? 'var(--color-text)' : 'var(--color-text-muted)',
            fontWeight: isHelpActive ? 500 : 400,
            borderLeft: isHelpActive ? '3px solid var(--color-primary)' : '3px solid transparent',
            transition: 'all var(--duration-fast) ease',
          }}
        >
          <HelpCircleIcon size={16} />
          Help & Guide
        </Link>
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
