import { useState } from 'react';

interface ThinkingBlockProps {
  thinking: string;
  defaultOpen?: boolean;
}

export default function ThinkingBlock({ thinking, defaultOpen = false }: ThinkingBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const tokenEstimate = Math.round(thinking.length / 4);

  return (
    <div
      className="rounded-lg border my-2 overflow-hidden"
      style={{
        borderColor: 'var(--color-thinking-border)',
        backgroundColor: 'var(--color-thinking)',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium cursor-pointer"
        style={{ color: 'var(--color-text)' }}
      >
        <span>
          {open ? '\u25BE' : '\u25B8'} Thinking
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          ~{tokenEstimate.toLocaleString()} tokens
        </span>
      </button>
      {open && (
        <div
          className="px-4 py-3 border-t text-sm whitespace-pre-wrap"
          style={{ borderColor: 'var(--color-thinking-border)', color: 'var(--color-text-muted)' }}
        >
          {thinking}
        </div>
      )}
    </div>
  );
}
