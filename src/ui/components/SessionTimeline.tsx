import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, ZapIcon, ChevronRightIcon, ChevronDownIcon } from './Icons';
import Badge from './Badge';

interface SessionInfo {
  id: string;
  summary: string;
  messageCount: number;
  model: string;
  gitBranch: string;
  slug: string;
  modifiedAt: string;
  fileSize: number;
  agentCount: number;
}

interface Agent {
  agentId: string;
  parentSessionId: string;
  description?: string;
}

interface Props {
  sessions: SessionInfo[];
  agents: Agent[];
  projectId: string;
}

const MAX_VISIBLE_AGENTS = 2;

function groupByDate(sessions: SessionInfo[]): { label: string; sessions: SessionInfo[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const thisWeek = today - 6 * 86400000;

  const groups: { label: string; sessions: SessionInfo[] }[] = [];
  const groupMap = new Map<string, SessionInfo[]>();

  for (const session of sessions) {
    const d = new Date(session.modifiedAt);
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    let label: string;

    if (t >= today) label = 'Today';
    else if (t >= yesterday) label = 'Yesterday';
    else if (t >= thisWeek) label = 'This Week';
    else label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (!groupMap.has(label)) {
      groupMap.set(label, []);
    }
    groupMap.get(label)!.push(session);
  }

  for (const [label, sessions] of groupMap) {
    groups.push({ label, sessions });
  }

  return groups;
}

export default function SessionTimeline({ sessions, agents, projectId }: Props) {
  const navigate = useNavigate();
  const groups = groupByDate(sessions);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  const toggleAgents = (sessionId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  return (
    <div className="relative">
      {/* Vertical rail */}
      <div
        className="absolute left-[23px] top-0 bottom-0 w-[2px]"
        style={{ backgroundColor: 'var(--color-border)' }}
      />

      <div className="space-y-6 stagger-children">
        {groups.map(group => (
          <div key={group.label}>
            {/* Date group header */}
            <div className="flex items-center gap-3 mb-3 ml-[14px]">
              <div
                className="w-[20px] h-[20px] rounded-full flex items-center justify-center z-10"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '2px solid var(--color-primary)',
                }}
              />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                {group.label}
              </span>
            </div>

            {/* Sessions in this group */}
            <div className="space-y-2 ml-[48px]">
              {group.sessions.map((session, idx) => {
                const sessionAgents = agents.filter(a => a.parentSessionId === session.id);
                const isRecent = idx === 0 && group.label === 'Today';
                const isExpanded = expandedAgents.has(session.id);
                const visibleAgents = isExpanded ? sessionAgents : sessionAgents.slice(0, MAX_VISIBLE_AGENTS);
                const hiddenCount = sessionAgents.length - MAX_VISIBLE_AGENTS;

                return (
                  <div key={session.id} className="relative animate-fadeIn">
                    {/* Node dot */}
                    <div
                      className="absolute -left-[33px] top-4 w-[10px] h-[10px] rounded-full z-10"
                      style={{
                        backgroundColor: isRecent ? 'var(--color-primary)' : 'var(--color-border)',
                        boxShadow: isRecent ? 'var(--shadow-glow)' : 'none',
                      }}
                    />

                    {/* Session card */}
                    <div className="card group/session">
                      <Link
                        to={`/sessions/${session.id}`}
                        className="block p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                              {session.summary || session.slug || `Session ${session.id.slice(0, 8)}`}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {session.model && (
                                <Badge variant="model">
                                  {session.model.replace('claude-', '').split('-').slice(0, 2).join('-')}
                                </Badge>
                              )}
                              {session.gitBranch && (
                                <Badge variant="default">{session.gitBranch}</Badge>
                              )}
                              <Badge variant="default">{session.messageCount} msgs</Badge>
                              <Badge variant="default">{(session.fileSize / 1024).toFixed(0)} KB</Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Quick preview */}
                            <button
                              onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/sessions/${session.id}`);
                              }}
                              className="opacity-0 group-hover/session:opacity-100 btn-ghost p-1.5 rounded-lg"
                              title="Open session"
                              style={{ transition: 'opacity var(--duration-fast) ease' }}
                            >
                              <EyeIcon size={14} />
                            </button>

                            <div className="text-xs text-right whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                              {new Date(session.modifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              <br />
                              {new Date(session.modifiedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </div>

                            <ChevronRightIcon size={14} />
                          </div>
                        </div>
                      </Link>
                    </div>

                    {/* Sub-agents — collapsed to one line with expand */}
                    {sessionAgents.length > 0 && (
                      <div className="ml-4 mt-1">
                        <div className="flex flex-wrap items-center gap-1">
                          {visibleAgents.map(agent => (
                            <button
                              key={agent.agentId}
                              onClick={() => navigate(`/agents/${encodeURIComponent(projectId)}/${encodeURIComponent(agent.agentId)}`)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs btn-ghost"
                              style={{
                                borderLeft: '2px dashed var(--color-primary)',
                              }}
                            >
                              <ZapIcon size={10} />
                              <span className="font-mono" style={{ color: 'var(--color-text-muted)' }}>
                                {agent.agentId.slice(0, 8)}
                              </span>
                              {agent.description && (
                                <span className="max-w-[160px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                                  {agent.description}
                                </span>
                              )}
                            </button>
                          ))}

                          {/* Expand/collapse toggle for 3+ agents */}
                          {hiddenCount > 0 && !isExpanded && (
                            <button
                              onClick={() => toggleAgents(session.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs btn-ghost"
                              style={{ color: 'var(--color-primary)' }}
                            >
                              +{hiddenCount} more
                              <ChevronDownIcon size={10} />
                            </button>
                          )}

                          {isExpanded && hiddenCount > 0 && (
                            <button
                              onClick={() => toggleAgents(session.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs btn-ghost"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              show less
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
