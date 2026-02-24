import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownPreview() {
  const { id } = useParams<{ id: string }>();
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [includeThinking, setIncludeThinking] = useState(true);
  const [includeTools, setIncludeTools] = useState(true);

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
  };

  if (loading) return <div className="p-6" style={{ color: 'var(--color-text-muted)' }}>Loading preview...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Markdown Preview</h1>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <input type="checkbox" checked={includeThinking} onChange={e => setIncludeThinking(e.target.checked)} />
          Thinking
        </label>
        <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <input type="checkbox" checked={includeTools} onChange={e => setIncludeTools(e.target.checked)} />
          Tool Calls
        </label>
        <button onClick={handleCopy} className="text-xs px-3 py-1 rounded border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          Copy
        </button>
        <a href={`/api/export/session/${id}`} className="text-xs px-3 py-1 rounded border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          Download .md
        </a>
      </div>

      {/* Rendered markdown */}
      <article className="prose prose-sm max-w-none" style={{ color: 'var(--color-text)' }}>
        <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
      </article>
    </div>
  );
}
