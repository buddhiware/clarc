import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextPanel, type PanelContent } from './ContextPanelProvider';
import { Skeleton, SkeletonGroup } from './Skeleton';
import { XIcon, ArrowLeftIcon, ExternalLinkIcon } from './Icons';
import MessageRenderer from './MessageRenderer';

export default function ContextPanel() {
  const { isOpen, content, history, panelWidth, closePanel, goBack, setPanelWidth } = useContextPanel();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidth;
  }, [panelWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = dragStartX.current - e.clientX;
      setPanelWidth(dragStartWidth.current + delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, setPanelWidth]);

  return (
    <div
      className="fixed top-0 right-0 h-full z-40 flex"
      style={{
        width: panelWidth,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: isDragging ? 'none' : 'transform var(--duration-slow) var(--ease-out-expo)',
      }}
    >
      {/* Resize drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className="flex-shrink-0 w-[5px] h-full relative group/handle"
        style={{
          cursor: 'col-resize',
        }}
      >
        {/* Visual indicator line */}
        <div
          className="absolute inset-y-0 left-0 w-[1px] group-hover/handle:w-[3px]"
          style={{
            backgroundColor: isDragging ? 'var(--color-primary)' : 'var(--color-border)',
            transition: isDragging ? 'none' : 'background-color var(--duration-fast) ease, width var(--duration-fast) ease',
          }}
        />
      </div>

      {/* Panel content */}
      <div
        className="flex-1 flex flex-col border-l min-w-0"
        style={{
          backgroundColor: 'var(--color-bg)',
          borderColor: 'var(--color-border)',
          boxShadow: isOpen ? 'var(--shadow-xl)' : 'none',
        }}
      >
        {content && (
          <>
            {/* Header */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              {history.length > 0 && (
                <button onClick={goBack} className="btn-ghost p-1" title="Back">
                  <ArrowLeftIcon size={16} />
                </button>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                  <PanelTitle content={content} />
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {content.type === 'agent' && 'Sub-agent conversation'}
                  {content.type === 'session-preview' && 'Session preview'}
                  {content.type === 'tool-detail' && `Tool: ${content.toolCall?.name}`}
                  {content.type === 'file-content' && content.filePath}
                </div>
              </div>
              <button onClick={closePanel} className="btn-ghost p-1" title="Close panel">
                <XIcon size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <PanelBody content={content} />
            </div>

            {/* Footer */}
            <PanelFooter content={content} />
          </>
        )}
      </div>
    </div>
  );
}

function PanelTitle({ content }: { content: PanelContent }) {
  if (content.title) return <>{content.title}</>;
  if (content.type === 'agent') {
    return <>Agent {content.agentId?.slice(0, 8)}{content.agentDescription ? ` — ${content.agentDescription}` : ''}</>;
  }
  if (content.type === 'session-preview') return <>Session Preview</>;
  if (content.type === 'tool-detail') return <>{content.toolCall?.name}</>;
  if (content.type === 'file-content') return <>{content.filePath?.split('/').pop()}</>;
  return <>Panel</>;
}

function PanelBody({ content }: { content: PanelContent }) {
  if (content.type === 'agent') return <AgentPanel content={content} />;
  if (content.type === 'session-preview') return <SessionPreviewPanel content={content} />;
  if (content.type === 'tool-detail') return <ToolDetailPanel content={content} />;
  if (content.type === 'file-content') return <FileContentPanel content={content} />;
  return null;
}

function PanelFooter({ content }: { content: PanelContent }) {
  const navigate = useNavigate();
  const { closePanel } = useContextPanel();

  const handleNavigate = (path: string) => {
    closePanel();
    navigate(path);
  };

  if (content.type === 'agent' && content.projectId && content.agentId) {
    return (
      <div
        className="flex-shrink-0 px-4 py-2 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          onClick={() => handleNavigate(`/agents/${encodeURIComponent(content.projectId!)}/${encodeURIComponent(content.agentId!)}`)}
          className="btn-ghost w-full flex items-center justify-center gap-2 text-xs"
        >
          <ExternalLinkIcon size={12} />
          Open full agent view
        </button>
      </div>
    );
  }

  if (content.type === 'session-preview' && content.sessionId) {
    return (
      <div
        className="flex-shrink-0 px-4 py-2 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          onClick={() => handleNavigate(`/sessions/${content.sessionId}`)}
          className="btn-ghost w-full flex items-center justify-center gap-2 text-xs"
        >
          <ExternalLinkIcon size={12} />
          Open full session
        </button>
      </div>
    );
  }

  return null;
}

// ────────────────────────────────
// Panel content renderers
// ────────────────────────────────

function AgentPanel({ content }: { content: PanelContent }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!content.projectId || !content.agentId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/agents/${encodeURIComponent(content.projectId)}/${encodeURIComponent(content.agentId)}`)
      .then(r => r.ok ? r.json() : Promise.reject(`${r.status}`))
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [content.projectId, content.agentId]);

  if (loading) return <PanelSkeleton />;
  if (error) return <div className="p-4 text-sm" style={{ color: 'var(--color-accent-rose)' }}>Error loading agent: {error}</div>;
  if (!data?.messages) return <div className="p-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>No data</div>;

  return (
    <div className="space-y-2 p-3">
      {data.messages.map((msg: any, i: number) => (
        <MessageRenderer key={msg.uuid || i} message={msg} showThinking={true} />
      ))}
    </div>
  );
}

function SessionPreviewPanel({ content }: { content: PanelContent }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!content.sessionId) return;
    setLoading(true);
    fetch(`/api/sessions/${content.sessionId}/messages?limit=10`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [content.sessionId]);

  if (loading) return <PanelSkeleton />;
  if (!data?.messages) return <div className="p-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>No messages</div>;

  return (
    <div className="space-y-2 p-3">
      {data.messages.map((msg: any, i: number) => (
        <MessageRenderer key={msg.uuid || i} message={msg} showThinking={false} />
      ))}
      {data.hasMore && (
        <div className="text-center py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {data.total - data.messages.length} more messages...
        </div>
      )}
    </div>
  );
}

function ToolDetailPanel({ content }: { content: PanelContent }) {
  const tc = content.toolCall;
  if (!tc) return null;

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Input</div>
        <pre
          className="text-xs p-3 rounded-lg overflow-x-auto"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-text)',
            maxHeight: 400,
          }}
        >
          {typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input, null, 2)}
        </pre>
      </div>
      {tc.result !== undefined && (
        <div>
          <div className="text-xs font-semibold mb-1" style={{ color: tc.isError ? 'var(--color-accent-rose)' : 'var(--color-text-muted)' }}>
            {tc.isError ? 'Error' : 'Result'}
          </div>
          <pre
            className="text-xs p-3 rounded-lg overflow-x-auto"
            style={{
              backgroundColor: tc.isError ? 'var(--color-error)' : 'var(--color-surface-2)',
              color: 'var(--color-text)',
              maxHeight: 600,
            }}
          >
            {typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function FileContentPanel({ content }: { content: PanelContent }) {
  return (
    <div className="p-4">
      {content.filePath && (
        <div className="text-xs font-mono mb-2 px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
          {content.filePath}
        </div>
      )}
      <pre
        className="text-xs p-3 rounded-lg overflow-x-auto"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          color: 'var(--color-text)',
          maxHeight: '80vh',
        }}
      >
        {content.fileContent || 'No content'}
      </pre>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton variant="text" width="40%" />
      <SkeletonGroup count={4} />
      <Skeleton variant="card" height={80} />
      <SkeletonGroup count={3} />
    </div>
  );
}
