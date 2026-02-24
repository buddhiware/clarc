import { useState } from 'react';

interface ToolCallBlockProps {
  name: string;
  input: any;
  result?: any;
  isError?: boolean;
  defaultOpen?: boolean;
}

export default function ToolCallBlock({ name, input, result, isError, defaultOpen = false }: ToolCallBlockProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Format input nicely based on tool name
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

  return (
    <div
      className="rounded-lg border my-2 overflow-hidden"
      style={{
        borderColor: isError ? 'var(--color-error-border)' : 'var(--color-tool-border)',
        backgroundColor: isError ? 'var(--color-error)' : 'var(--color-tool)',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-pointer text-left"
        style={{ color: 'var(--color-text)' }}
      >
        <span>{open ? '\u25BE' : '\u25B8'}</span>
        <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-surface-2)' }}>
          {name}
        </span>
        {shortInput && (
          <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)', maxWidth: '400px' }}>
            {shortInput}
          </span>
        )}
        {isError && (
          <span className="text-xs text-red-500 ml-auto">ERROR</span>
        )}
      </button>
      {open && (
        <div className="border-t px-4 py-3 space-y-3" style={{ borderColor: isError ? 'var(--color-error-border)' : 'var(--color-tool-border)' }}>
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Input</div>
            <pre className="text-xs overflow-x-auto p-2 rounded" style={{ backgroundColor: 'var(--color-surface-2)' }}>
              {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
            </pre>
          </div>
          {result !== undefined && (
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Result</div>
              <pre className="text-xs overflow-x-auto p-2 rounded max-h-96" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                {typeof result === 'string' ? result.slice(0, 5000) : JSON.stringify(result, null, 2)?.slice(0, 5000)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
