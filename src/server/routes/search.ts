import { Hono } from 'hono';
import { getIndex } from '../../data/scanner';
import { parseSession } from '../../data/parser';
import type { SearchResult } from '../../shared/types';

const app = new Hono();

// GET /api/search?q=...&project=...&model=...&after=...&before=...
app.get('/', async (c) => {
  const q = c.req.query('q') || '';
  const projectFilter = c.req.query('project');
  const modelFilter = c.req.query('model');
  const after = c.req.query('after');
  const before = c.req.query('before');
  const limit = parseInt(c.req.query('limit') || '50');

  if (!q) return c.json([]);

  const index = await getIndex();
  const results: SearchResult[] = [];
  const queryLower = q.toLowerCase();

  for (const project of index.projects) {
    if (projectFilter && project.id !== projectFilter && project.name !== projectFilter) continue;

    for (const sessionRef of project.sessions) {
      if (modelFilter && sessionRef.model !== modelFilter) continue;
      if (after && sessionRef.modifiedAt < new Date(after)) continue;
      if (before && sessionRef.modifiedAt > new Date(before)) continue;

      try {
        const session = await parseSession(sessionRef.filePath, sessionRef.id, sessionRef.projectId);

        for (const msg of session.messages) {
          if (results.length >= limit) break;

          // Search through content blocks
          for (const block of msg.content) {
            if (block.text && block.text.toLowerCase().includes(queryLower)) {
              const idx = block.text.toLowerCase().indexOf(queryLower);
              const start = Math.max(0, idx - 60);
              const end = Math.min(block.text.length, idx + q.length + 60);
              const snippet = (start > 0 ? '...' : '') + block.text.slice(start, end) + (end < block.text.length ? '...' : '');

              results.push({
                sessionId: sessionRef.id,
                projectId: project.id,
                projectName: project.name,
                messageUuid: msg.uuid,
                type: msg.type,
                snippet,
                timestamp: msg.timestamp,
                model: msg.model,
              });
              break;
            }
          }

          // Search through thinking blocks
          if (msg.thinking) {
            for (const tb of msg.thinking) {
              if (results.length >= limit) break;
              if (tb.thinking.toLowerCase().includes(queryLower)) {
                const idx = tb.thinking.toLowerCase().indexOf(queryLower);
                const start = Math.max(0, idx - 60);
                const end = Math.min(tb.thinking.length, idx + q.length + 60);
                const snippet = (start > 0 ? '...' : '') + tb.thinking.slice(start, end) + (end < tb.thinking.length ? '...' : '');

                results.push({
                  sessionId: sessionRef.id,
                  projectId: project.id,
                  projectName: project.name,
                  messageUuid: msg.uuid,
                  type: 'thinking',
                  snippet,
                  timestamp: msg.timestamp,
                  model: msg.model,
                });
                break;
              }
            }
          }
        }
      } catch {
        // Skip sessions that fail to parse
      }

      if (results.length >= limit) break;
    }

    if (results.length >= limit) break;
  }

  return c.json(results);
});

export default app;
