import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import ConversationTurn, { groupIntoTurns } from '../components/ConversationTurn';
import ScrollProgress from '../components/ScrollProgress';
import ScrollNav from '../components/ScrollNav';
import Badge from '../components/Badge';
import { Skeleton, SkeletonGroup } from '../components/Skeleton';
import { useContextPanel } from '../components/ContextPanelProvider';
import { ChevronRightIcon, ZapIcon, CopyIcon, CheckIcon } from '../components/Icons';
import { useSessionNavigation } from '../hooks/useSessionNavigation';
import { useSettings } from '../hooks/useSettings';

interface SessionData {
  id: string;
  projectId: string;
  projectName: string;
  messages: any[];
  agents: { agentId: string; description?: string }[];
  metadata: {
    slug?: string;
    model?: string;
    gitBranch?: string;
    cwd?: string;
    version?: string;
    startedAt?: string;
    endedAt?: string;
    durationMs?: number;
    totalMessages: number;
    tokenUsage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreateTokens: number };
    estimatedCostUsd: number;
  };
}

function SessionSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="px-6 py-4">
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="title" width="60%" />
        <div className="flex gap-2 mt-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="text" width="60px" />)}
        </div>
      </div>
      <div className="space-y-4 px-6">
        <Skeleton variant="card" height={80} />
        <SkeletonGroup count={3} />
        <Skeleton variant="card" height={120} />
        <SkeletonGroup count={5} />
      </div>
    </div>
  );
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: session, loading, error } = useApi<SessionData>(`/sessions/${id}`);
  const [settings] = useSettings();
  const [showThinking, setShowThinking] = useState(settings.defaultShowThinking);
  const [idCopied, setIdCopied] = useState(false);
  const [agentsExpanded, setAgentsExpanded] = useState(false);
  const { openPanel } = useContextPanel();
  const navigate = useNavigate();

  const location = useLocation();

  // Enable [ / ] keyboard navigation between sessions
  useSessionNavigation(session?.projectId || '', session?.id || '');

  // Scroll to message anchor from URL hash (e.g. #msg-abc123)
  useEffect(() => {
    if (!loading && session && location.hash) {
      // Small delay to let the DOM render
      const timer = setTimeout(() => {
        const el = document.querySelector(location.hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-flash');
          setTimeout(() => el.classList.remove('highlight-flash'), 2000);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [loading, session, location.hash]);

  if (loading) return <SessionSkeleton />;
  if (error) return <div className="p-6 text-sm" style={{ color: 'var(--color-accent-rose)' }}>Error: {error}</div>;
  if (!session) return <div className="p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>Session not found</div>;

  const meta = session.metadata;
  const tokens = meta.tokenUsage;
  const turns = groupIntoTurns(session.messages);

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(session.id);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  };

  const handleToolClick = (toolCall: { id: string; name: string; input: any; result?: any; isError?: boolean }) => {
    openPanel({
      type: 'tool-detail',
      toolCall,
      title: toolCall.name,
    });
  };

  const handleAgentClick = (agentId: string) => {
    navigate(`/agents/${encodeURIComponent(session.projectId)}/${encodeURIComponent(agentId)}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <ScrollProgress />

      {/* Sticky glass header */}
      <div
        className="sticky top-0 z-10 px-6 py-3 glass"
        style={{
          borderBottom: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs">
              <Link
                to={`/projects/${encodeURIComponent(session.projectId)}`}
                className="hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                {session.projectName}
              </Link>
              <ChevronRightIcon size={10} />
              <span style={{ color: 'var(--color-text)' }}>
                {meta.slug || `Session ${session.id.slice(0, 8)}`}
              </span>
              <button onClick={handleCopyId} className="btn-ghost p-0.5 rounded ml-1" title="Copy session ID">
                {idCopied ? <CheckIcon size={10} /> : <CopyIcon size={10} />}
              </button>
            </div>

            {/* Metadata pills */}
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {meta.model && (
                <Badge variant="model">{meta.model.replace('claude-', '')}</Badge>
              )}
              <Badge variant="default">{meta.totalMessages} msgs</Badge>
              <Badge variant="default">In: {tokens.inputTokens.toLocaleString()}</Badge>
              <Badge variant="default">Out: {tokens.outputTokens.toLocaleString()}</Badge>
              {tokens.cacheReadTokens > 0 && (
                <Badge variant="default">Cache: {tokens.cacheReadTokens.toLocaleString()}</Badge>
              )}
              <Badge variant={meta.estimatedCostUsd > 0.10 ? 'error' : meta.estimatedCostUsd > 0.01 ? 'warning' : 'success'}>
                ${meta.estimatedCostUsd.toFixed(4)}
              </Badge>
              {meta.gitBranch && <Badge variant="default">{meta.gitBranch}</Badge>}
              {meta.durationMs && <Badge variant="default">{Math.round(meta.durationMs / 60000)}min</Badge>}
              {meta.startedAt && (
                <Badge variant="default">
                  {new Date(meta.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="btn-ghost text-xs px-3 py-1.5 rounded-lg"
              style={{
                backgroundColor: showThinking ? 'var(--color-thinking)' : 'transparent',
                border: '1px solid var(--color-border)',
              }}
            >
              {showThinking ? 'Hide' : 'Show'} Thinking
            </button>
            <a
              href={`/api/export/session/${session.id}`}
              className="btn-ghost text-xs px-3 py-1.5 rounded-lg"
              style={{ border: '1px solid var(--color-border)' }}
            >
              Export .md
            </a>
          </div>
        </div>

        {/* Agent chips — collapsed to one line with expand */}
        {session.agents.length > 0 && (() => {
          const maxVisible = 3;
          const visible = agentsExpanded ? session.agents : session.agents.slice(0, maxVisible);
          const hiddenCount = session.agents.length - maxVisible;
          return (
            <div className="flex gap-1.5 mt-2 flex-wrap items-center">
              {visible.map(a => (
                <button
                  key={a.agentId}
                  onClick={() => handleAgentClick(a.agentId)}
                  className="btn-ghost inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--color-surface-2)',
                    color: 'var(--color-primary)',
                  }}
                >
                  <ZapIcon size={10} />
                  {a.agentId.slice(0, 8)}
                </button>
              ))}
              {hiddenCount > 0 && !agentsExpanded && (
                <button
                  onClick={() => setAgentsExpanded(true)}
                  className="text-xs px-2 py-0.5 rounded-full btn-ghost"
                  style={{ color: 'var(--color-primary)' }}
                >
                  +{hiddenCount} more
                </button>
              )}
              {agentsExpanded && hiddenCount > 0 && (
                <button
                  onClick={() => setAgentsExpanded(false)}
                  className="text-xs px-2 py-0.5 rounded-full btn-ghost"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  less
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Conversation turns */}
      <div className="space-y-1 stagger-children">
        {turns.map((turnMsgs, i) => (
          <ConversationTurn
            key={i}
            messages={turnMsgs}
            turnNumber={i + 1}
            showThinking={showThinking}
            collapseThreshold={settings.collapseThreshold || undefined}
            onToolClick={handleToolClick}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="p-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
        End of session &middot; {meta.totalMessages} messages &middot; ${meta.estimatedCostUsd.toFixed(4)}
      </div>

      <ScrollNav />
    </div>
  );
}
