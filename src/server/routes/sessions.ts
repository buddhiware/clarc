import { Hono } from 'hono';
import { getIndex } from '../../data/scanner';
import { parseSession, pairToolCalls } from '../../data/parser';

const app = new Hono();

// GET /api/sessions/bookmarks?ids=id1,id2,id3 — summary data for bookmarked sessions
app.get('/bookmarks', async (c) => {
  const idsParam = c.req.query('ids') || '';
  const ids = idsParam.split(',').filter(Boolean);
  if (ids.length === 0) return c.json({ sessions: [] });

  const index = await getIndex();
  const results: any[] = [];

  for (const id of ids) {
    for (const project of index.projects) {
      const ref = project.sessions.find(s => s.id === id);
      if (ref) {
        try {
          const session = await parseSession(ref.filePath, ref.id, ref.projectId);
          results.push({
            id: ref.id,
            projectId: project.id,
            projectName: project.name,
            slug: session.metadata.slug || ref.id.slice(0, 8),
            model: session.metadata.model,
            messageCount: session.metadata.totalMessages,
            costUsd: session.metadata.estimatedCostUsd,
            startedAt: session.metadata.startedAt,
          });
        } catch {
          // skip sessions that fail to parse
        }
        break;
      }
    }
  }

  return c.json({ sessions: results });
});

// GET /api/sessions/:id — full parsed session
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const index = await getIndex();

  // Find the session across all projects
  for (const project of index.projects) {
    const ref = project.sessions.find(s => s.id === id);
    if (ref) {
      const session = await parseSession(ref.filePath, ref.id, ref.projectId);
      pairToolCalls(session.messages);
      return c.json({
        ...session,
        projectName: project.name,
        projectId: project.id,
      });
    }
  }

  return c.json({ error: 'Session not found' }, 404);
});

// GET /api/sessions/:id/messages — paginated messages
app.get('/:id/messages', async (c) => {
  const id = c.req.param('id');
  const offset = parseInt(c.req.query('offset') || '0');
  const limit = parseInt(c.req.query('limit') || '50');
  const index = await getIndex();

  for (const project of index.projects) {
    const ref = project.sessions.find(s => s.id === id);
    if (ref) {
      const session = await parseSession(ref.filePath, ref.id, ref.projectId);
      pairToolCalls(session.messages);
      const page = session.messages.slice(offset, offset + limit);
      return c.json({
        messages: page,
        total: session.messages.length,
        offset,
        limit,
        hasMore: offset + limit < session.messages.length,
      });
    }
  }

  return c.json({ error: 'Session not found' }, 404);
});

// GET /api/agents/:projectId/:agentId — sub-agent session
app.get('/agents/:projectId/:agentId', async (c) => {
  const projectId = c.req.param('projectId');
  const agentId = c.req.param('agentId');
  const index = await getIndex();

  const project = index.projects.find(p => p.id === projectId);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  const agent = project.agents.find(a => a.agentId === agentId);
  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  const session = await parseSession(agent.filePath, agentId, projectId);
  pairToolCalls(session.messages);
  return c.json({
    ...session,
    projectName: project.name,
    parentSessionId: agent.parentSessionId,
  });
});

export default app;
