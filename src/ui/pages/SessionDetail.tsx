import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import MessageRenderer from '../components/MessageRenderer';

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

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: session, loading, error } = useApi<SessionData>(`/sessions/${id}`);
  const [showThinking, setShowThinking] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  if (loading) return <div className="p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading session...</div>;
  if (error) return <div className="p-6 text-sm text-red-500">Error: {error}</div>;
  if (!session) return <div className="p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>Session not found</div>;

  const meta = session.metadata;
  const tokens = meta.tokenUsage;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="sticky top-0 z-10 border-b px-6 py-3" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                to={`/projects/${encodeURIComponent(session.projectId)}`}
                className="text-xs hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                {session.projectName}
              </Link>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>/</span>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                {meta.slug || `Session ${session.id.slice(0, 8)}`}
              </span>
            </div>
            <div className="flex gap-3 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {meta.model && <span className="font-mono">{meta.model.replace('claude-', '')}</span>}
              <span>{meta.totalMessages} msgs</span>
              <span>In: {tokens.inputTokens.toLocaleString()} Out: {tokens.outputTokens.toLocaleString()}</span>
              {tokens.cacheReadTokens > 0 && <span>Cache: {tokens.cacheReadTokens.toLocaleString()}</span>}
              <span className="font-medium" style={{ color: 'var(--color-primary)' }}>
                ${meta.estimatedCostUsd.toFixed(4)}
              </span>
              {meta.gitBranch && <span>{meta.gitBranch}</span>}
              {meta.durationMs && <span>{Math.round(meta.durationMs / 60000)}min</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="text-xs px-3 py-1 rounded border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: showThinking ? 'var(--color-thinking)' : 'transparent',
                color: 'var(--color-text-muted)',
              }}
            >
              {showThinking ? 'Hide' : 'Show'} Thinking
            </button>
            <a
              href={`/api/export/session/${session.id}`}
              className="text-xs px-3 py-1 rounded border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              Export .md
            </a>
          </div>
        </div>

        {/* Sub-agents */}
        {session.agents.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {session.agents.map(a => (
              <span key={a.agentId} className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-primary)' }}>
                agent:{a.agentId.slice(0, 8)}
                {a.description && ` — ${a.description}`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {session.messages.map((msg, i) => (
          <MessageRenderer key={msg.uuid || i} message={msg} showThinking={showThinking} />
        ))}
      </div>

      {/* Footer */}
      <div className="p-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
        End of session &middot; {meta.totalMessages} messages &middot; ${meta.estimatedCostUsd.toFixed(4)}
      </div>
    </div>
  );
}
