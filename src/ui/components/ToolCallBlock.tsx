import { useState, useRef, useEffect } from 'react';
import { TerminalIcon, EyeIcon, PencilIcon, GlobeIcon, SearchIcon, ExternalLinkIcon } from './Icons';

interface ToolCallBlockProps {
  name: string;
  input: any;
  result?: any;
  isError?: boolean;
  defaultOpen?: boolean;
  onExpand?: () => void;
}

const TOOL_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  Bash: TerminalIcon,
  Read: EyeIcon,
  Write: PencilIcon,
  Edit: PencilIcon,
  Glob: SearchIcon,
  Grep: SearchIcon,
  WebFetch: GlobeIcon,
  WebSearch: GlobeIcon,
};

export default function ToolCallBlock({ name, input, result, isError, defaultOpen = false, onExpand }: ToolCallBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [input, result, open]);

  const formatInput = () => {
    if (!input) return '';
    if (name === 'Read' && input.file_path) return input.file_path;
    if (name === 'Write' && input.file_path) return input.file_path;
    if (name === 'Edit' && input.file_path) return input.file_path;
    if (name === 'Bash' && input.command) return input.command;
    if (name === 'Glob' && input.pattern) return input.pattern;
    if (name === 'Grep' && input.pattern) return input.pattern;
    if (name === 'WebFetch' && input.url) return input.url;
    if (name === 'WebSearch' && input.query) return input.query;
    return '';
  };

  const shortInput = formatInput();
  const ToolIcon = TOOL_ICONS[name] || TerminalIcon;

  return (
    <div
      className="rounded-lg my-2 overflow-hidden group/tool"
      style={{
        border: `1px solid ${isError ? 'var(--color-error-border)' : 'var(--color-tool-border)'}`,
        backgroundColor: isError ? 'var(--color-error)' : 'var(--color-tool)',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium cursor-pointer text-left transition-colors"
        style={{ color: 'var(--color-text)' }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform var(--duration-fast) var(--ease-out-expo)',
            color: 'var(--color-text-muted)',
            flexShrink: 0,
          }}
        >
          <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
          <ToolIcon size={14} />
        </span>

        <span
          className="font-mono text-xs px-1.5 py-0.5 rounded"
          style={{ backgroundColor: 'var(--color-surface-2)', flexShrink: 0 }}
        >
          {name}
        </span>

        {shortInput && (
          <span
            className="text-xs truncate font-mono"
            style={{ color: 'var(--color-text-muted)', maxWidth: '400px' }}
          >
            {shortInput}
          </span>
        )}

        <span className="ml-auto flex items-center gap-2 flex-shrink-0">
          {isError && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-accent-rose)' }}>
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  backgroundColor: 'var(--color-accent-rose)',
                  animation: 'pulse-subtle 2s infinite',
                }}
              />
              ERROR
            </span>
          )}
          {onExpand && (
            <button
              onClick={e => { e.stopPropagation(); onExpand(); }}
              className="opacity-0 group-hover/tool:opacity-100 transition-opacity btn-ghost p-1 rounded"
              title="Open in panel"
            >
              <ExternalLinkIcon size={12} />
            </button>
          )}
        </span>
      </button>

      <div
        style={{
          maxHeight: open ? Math.max(contentHeight + 24, 200) : 0,
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: `max-height var(--duration-slow) var(--ease-out-expo), opacity var(--duration-base) ease`,
        }}
      >
        <div
          ref={contentRef}
          className="px-4 py-3 space-y-3"
          style={{ borderTop: `1px solid ${isError ? 'var(--color-error-border)' : 'var(--color-tool-border)'}` }}
        >
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Input</div>
            <pre
              className="text-xs overflow-x-auto p-3 rounded-lg"
              style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text)' }}
            >
              {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
            </pre>
          </div>
          {result !== undefined && (
            <div>
              <div
                className="text-xs font-semibold mb-1"
                style={{ color: isError ? 'var(--color-accent-rose)' : 'var(--color-text-muted)' }}
              >
                {isError ? 'Error' : 'Result'}
              </div>
              <pre
                className="text-xs overflow-x-auto p-3 rounded-lg"
                style={{
                  backgroundColor: isError ? 'var(--color-error)' : 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                  maxHeight: 384,
                }}
              >
                {typeof result === 'string' ? result.slice(0, 5000) : JSON.stringify(result, null, 2)?.slice(0, 5000)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
