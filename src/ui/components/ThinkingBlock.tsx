import { useState, useRef, useEffect } from 'react';
import Badge from './Badge';

interface ThinkingBlockProps {
  thinking: string;
  defaultOpen?: boolean;
}

export default function ThinkingBlock({ thinking, defaultOpen = false }: ThinkingBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const tokenEstimate = Math.round(thinking.length / 4);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [thinking]);

  return (
    <div
      className="rounded-lg my-2 overflow-hidden"
      style={{
        backgroundColor: 'var(--color-thinking)',
        borderLeft: '2px solid transparent',
        borderImage: 'var(--gradient-primary) 1',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors"
        style={{ color: 'var(--color-text)' }}
      >
        <span className="flex items-center gap-2">
          <svg
            className="chevron-icon"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform var(--duration-fast) var(--ease-out-expo)',
              color: 'var(--color-text-muted)',
            }}
          >
            <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ color: 'var(--color-accent-violet)' }}>Thinking</span>
        </span>
        <Badge variant="default">~{tokenEstimate.toLocaleString()} tokens</Badge>
      </button>
      <div
        style={{
          maxHeight: open ? contentHeight + 24 : 0,
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: `max-height var(--duration-slow) var(--ease-out-expo), opacity var(--duration-base) ease`,
        }}
      >
        <div
          ref={contentRef}
          className="px-4 py-3 text-sm whitespace-pre-wrap"
          style={{
            borderTop: '1px solid var(--color-thinking-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          {thinking}
        </div>
      </div>
    </div>
  );
}
