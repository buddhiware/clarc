import { useState } from 'react';
import { CopyIcon, CheckIcon } from './Icons';

interface CodeBlockProps {
  children: string;
  language?: string;
}

export default function CodeBlock({ children, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative group rounded-lg overflow-hidden my-2"
      style={{
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header with terminal dots */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          {/* macOS-style dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#febc2e' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#28c840' }} />
          </div>
          <span className="text-xs font-mono ml-2" style={{ color: 'var(--color-text-muted)' }}>
            {language || 'text'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 px-2 py-1 rounded-md text-xs btn-ghost"
          style={{
            transition: 'opacity var(--duration-fast) ease, background-color var(--duration-fast) ease',
          }}
        >
          {copied ? (
            <>
              <CheckIcon size={12} />
              <span style={{ color: 'var(--color-accent-emerald)' }}>Copied</span>
            </>
          ) : (
            <>
              <CopyIcon size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-sm" style={{ color: 'var(--color-text)' }}>
        <code>{children}</code>
      </pre>
    </div>
  );
}
