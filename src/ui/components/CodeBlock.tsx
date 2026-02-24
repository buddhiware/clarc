import { useState } from 'react';

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
    <div className="relative group rounded-lg overflow-hidden my-2" style={{ backgroundColor: 'var(--color-surface-2)' }}>
      <div className="flex items-center justify-between px-4 py-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-sm">
        <code>{children}</code>
      </pre>
    </div>
  );
}
