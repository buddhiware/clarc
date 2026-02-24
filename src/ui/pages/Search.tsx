import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon } from '../components/Icons';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';

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

function SearchResultsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <Skeleton key={i} variant="card" height={80} />)}
    </div>
  );
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
      <h1 className="text-2xl font-bold mb-6 text-gradient">Search</h1>

      {/* Search bar */}
      <div
        className="flex items-center gap-3 mb-6 p-1 rounded-xl glass"
        style={{
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="pl-3" style={{ color: 'var(--color-text-muted)' }}>
          <SearchIcon size={18} />
        </div>
        <input
          type="text"
          placeholder="Search messages, thinking, tool calls..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
          className="flex-1 py-2.5 text-sm bg-transparent outline-none"
          style={{ color: 'var(--color-text)' }}
          data-search-input
          autoFocus
        />
        <button
          onClick={doSearch}
          disabled={loading}
          className="btn-primary px-5 py-2 rounded-lg text-sm font-medium"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Loading */}
      {loading && <SearchResultsSkeleton />}

      {/* Empty state */}
      {searched && results.length === 0 && !loading && (
        <EmptyState
          icon={<SearchIcon size={32} />}
          title="No results found"
          description={`No matches for "${query}". Try a different search term.`}
        />
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-3 stagger-children">
          {results.map((r, i) => (
            <Link
              key={`${r.sessionId}-${r.messageUuid}-${i}`}
              to={`/sessions/${r.sessionId}`}
              className="card block animate-fadeIn"
            >
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="primary">{r.projectName}</Badge>
                  <Badge variant="default">{r.type}</Badge>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(r.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm" style={{ color: 'var(--color-text)' }}>
                  {highlightSnippet(r.snippet, query)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
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
      <mark
        style={{
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          color: 'var(--color-primary)',
          padding: '1px 3px',
          borderRadius: 3,
          fontWeight: 500,
        }}
      >
        {match}
      </mark>
      {after}
    </>
  );
}
