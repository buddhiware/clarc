import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface SearchResult {
  sessionId: string;
  projectId: string;
  projectName: string;
  messageUuid: string;
  type: string;
  snippet: string;
  timestamp: string;
  model?: string;
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Search</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Search messages, thinking, tool calls..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
          className="flex-1 px-4 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
          autoFocus
        />
        <button
          onClick={doSearch}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {searched && results.length === 0 && !loading && (
        <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
          No results found for "{query}"
        </div>
      )}

      <div className="space-y-3">
        {results.map((r, i) => (
          <Link
            key={`${r.sessionId}-${r.messageUuid}-${i}`}
            to={`/sessions/${r.sessionId}`}
            className="block p-4 rounded-lg border transition-colors hover:border-[var(--color-primary)]"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                {r.projectName}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {r.type}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {new Date(r.timestamp).toLocaleDateString()}
              </span>
            </div>
            <div className="text-sm" style={{ color: 'var(--color-text)' }}>
              {highlightSnippet(r.snippet, query)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function highlightSnippet(snippet: string, query: string) {
  if (!query) return snippet;
  const idx = snippet.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return snippet;

  const before = snippet.slice(0, idx);
  const match = snippet.slice(idx, idx + query.length);
  const after = snippet.slice(idx + query.length);

  return (
    <>
      {before}
      <mark style={{ backgroundColor: 'var(--color-thinking)', color: 'var(--color-primary)', padding: '0 2px', borderRadius: 2 }}>
        {match}
      </mark>
      {after}
    </>
  );
}
