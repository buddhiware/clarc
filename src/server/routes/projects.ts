import { Hono } from 'hono';
import { getIndex } from '../../data/scanner';
import { parseSession, pairToolCalls } from '../../data/parser';

const app = new Hono();

// GET /api/projects — list all projects
app.get('/', async (c) => {
  const index = await getIndex();
  const projects = index.projects.map(p => ({
    id: p.id,
    path: p.path,
    name: p.name,
    sessionCount: p.sessions.length,
    agentCount: p.agents.length,
    taskCount: p.tasks.reduce((sum, tl) => sum + tl.tasks.length, 0),
    lastActiveAt: p.lastActiveAt,
    messageCount: p.messageCount,
  }));
  return c.json(projects);
});

// GET /api/projects/:id — project detail
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const index = await getIndex();
  const project = index.projects.find(p => p.id === id);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  return c.json({
    id: project.id,
    path: project.path,
    name: project.name,
    lastActiveAt: project.lastActiveAt,
    messageCount: project.messageCount,
    sessions: project.sessions.map(s => ({
      id: s.id,
      summary: s.summary,
      messageCount: s.messageCount,
      model: s.model,
      gitBranch: s.gitBranch,
      slug: s.slug,
      modifiedAt: s.modifiedAt,
      fileSize: s.fileSize,
      agentCount: s.agents.length,
    })),
    agents: project.agents.map(a => ({
      agentId: a.agentId,
      parentSessionId: a.parentSessionId,
      description: a.description,
    })),
    tasks: project.tasks,
  });
});

// GET /api/projects/:id/sessions — sessions for a project
app.get('/:id/sessions', async (c) => {
  const id = c.req.param('id');
  const index = await getIndex();
  const project = index.projects.find(p => p.id === id);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  return c.json(project.sessions.map(s => ({
    id: s.id,
    summary: s.summary,
    messageCount: s.messageCount,
    model: s.model,
    gitBranch: s.gitBranch,
    slug: s.slug,
    modifiedAt: s.modifiedAt,
    fileSize: s.fileSize,
    agentCount: s.agents.length,
  })));
});

export default app;
