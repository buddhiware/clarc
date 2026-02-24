import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyIcon, CheckIcon } from '../components/Icons';
import { Skeleton, SkeletonGroup } from '../components/Skeleton';

export default function MarkdownPreview() {
  const { id } = useParams<{ id: string }>();
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [includeThinking, setIncludeThinking] = useState(true);
  const [includeTools, setIncludeTools] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (!includeThinking) params.set('thinking', 'false');
    if (!includeTools) params.set('tools', 'false');

    fetch(`/api/export/session/${id}/preview?${params}`)
      .then(res => res.text())
      .then(text => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, includeThinking, includeTools]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Skeleton variant="title" width="40%" />
        <SkeletonGroup count={6} />
        <Skeleton variant="card" height={200} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Glass toolbar */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 mb-6 px-4 py-3 rounded-xl glass"
        style={{
          borderBottom: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Markdown Preview</h1>
        <div className="flex-1" />

        {/* Toggle switches */}
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            className="relative w-8 h-4 rounded-full transition-colors"
            style={{ backgroundColor: includeThinking ? 'var(--color-primary)' : 'var(--color-surface-2)' }}
            onClick={() => setIncludeThinking(!includeThinking)}
          >
            <div
              className="absolute top-0.5 w-3 h-3 rounded-full transition-transform"
              style={{
                backgroundColor: 'white',
                transform: includeThinking ? 'translateX(16px)' : 'translateX(2px)',
                transition: 'transform var(--duration-fast) ease',
              }}
            />
          </div>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Thinking</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <div
            className="relative w-8 h-4 rounded-full transition-colors"
            style={{ backgroundColor: includeTools ? 'var(--color-primary)' : 'var(--color-surface-2)' }}
            onClick={() => setIncludeTools(!includeTools)}
          >
            <div
              className="absolute top-0.5 w-3 h-3 rounded-full transition-transform"
              style={{
                backgroundColor: 'white',
                transform: includeTools ? 'translateX(16px)' : 'translateX(2px)',
                transition: 'transform var(--duration-fast) ease',
              }}
            />
          </div>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Tool Calls</span>
        </label>

        <button onClick={handleCopy} className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg">
          {copied ? (
            <>
              <CheckIcon size={12} />
              <span style={{ color: 'var(--color-accent-emerald)' }}>Copied</span>
            </>
          ) : (
            <>
              <CopyIcon size={12} />
              Copy
            </>
          )}
        </button>

        <a
          href={`/api/export/session/${id}`}
          className="btn-ghost text-xs px-3 py-1.5 rounded-lg"
          style={{ border: '1px solid var(--color-border)' }}
        >
          Download .md
        </a>
      </div>

      {/* Rendered markdown */}
      <article className="prose prose-sm max-w-none animate-fadeIn" style={{ color: 'var(--color-text)' }}>
        <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
      </article>
    </div>
  );
}
