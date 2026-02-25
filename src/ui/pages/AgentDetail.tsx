import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import ConversationTurn, { groupIntoTurns } from '../components/ConversationTurn';
import ScrollProgress from '../components/ScrollProgress';
import ScrollNav from '../components/ScrollNav';
import Badge from '../components/Badge';
import { Skeleton, SkeletonGroup } from '../components/Skeleton';
import { ChevronRightIcon, ZapIcon, StarIcon, StarFilledIcon } from '../components/Icons';
import { useSettings, isSessionBookmarked, toggleSessionBookmark } from '../hooks/useSettings';

interface AgentData {
  id: string;
  projectId: string;
  projectName: string;
  parentSessionId: string;
  messages: any[];
  metadata: {
    model?: string;
    totalMessages: number;
    tokenUsage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreateTokens: number };
    estimatedCostUsd: number;
  };
}

function AgentSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="px-6 py-4">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="title" width="50%" />
        <div className="flex gap-2 mt-2">
          {[1, 2, 3].map(i => <Skeleton key={i} variant="text" width="60px" />)}
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

export default function AgentDetail() {
  const { projectId, agentId } = useParams<{ projectId: string; agentId: string }>();
  const { data: agent, loading, error } = useApi<AgentData>(
    `/sessions/agents/${encodeURIComponent(projectId || '')}/${encodeURIComponent(agentId || '')}`
  );
  const [settings, updateSettings] = useSettings();
  const [showThinking, setShowThinking] = useState(settings.defaultShowThinking);
  const navigate = useNavigate();
  const bookmarked = agent ? isSessionBookmarked(settings, agent.parentSessionId) : false;

  if (loading) return <AgentSkeleton />;
  if (error) return <div className="p-6 text-sm" style={{ color: 'var(--color-accent-rose)' }}>Error: {error}</div>;
  if (!agent) return <div className="p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>Agent not found</div>;

  const meta = agent.metadata;
  const tokens = meta.tokenUsage;
  const turns = groupIntoTurns(agent.messages);

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
                to={`/projects/${encodeURIComponent(agent.projectId)}`}
                className="hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                {agent.projectName}
              </Link>
              <ChevronRightIcon size={10} />
              <Link
                to={`/sessions/${agent.parentSessionId}`}
                className="hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                Session {agent.parentSessionId.slice(0, 8)}
              </Link>
              <ChevronRightIcon size={10} />
              <span className="inline-flex items-center gap-1" style={{ color: 'var(--color-text)' }}>
                <ZapIcon size={10} />
                Agent {(agentId || '').slice(0, 8)}
              </span>
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
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => toggleSessionBookmark(settings, updateSettings, agent.parentSessionId)}
              className="btn-ghost text-xs px-2 py-1.5 rounded-lg"
              style={{
                border: '1px solid var(--color-border)',
                color: bookmarked ? 'var(--color-accent-amber)' : undefined,
              }}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark parent session'}
            >
              {bookmarked ? <StarFilledIcon size={14} /> : <StarIcon size={14} />}
            </button>
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
            <button
              onClick={() => navigate(`/sessions/${agent.parentSessionId}`)}
              className="btn-ghost text-xs px-3 py-1.5 rounded-lg"
              style={{ border: '1px solid var(--color-border)' }}
            >
              Parent Session
            </button>
          </div>
        </div>
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
          />
        ))}
      </div>

      {/* Footer */}
      <div className="p-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
        End of agent conversation &middot; {meta.totalMessages} messages &middot; ${meta.estimatedCostUsd.toFixed(4)}
      </div>

      <ScrollNav />
    </div>
  );
}
