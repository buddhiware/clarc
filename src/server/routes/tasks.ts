import { Hono } from 'hono';
import { getIndex } from '../../data/scanner';

const app = new Hono();

// GET /api/tasks — all tasks across projects
app.get('/', async (c) => {
  const index = await getIndex();
  const allTasks = [];

  for (const project of index.projects) {
    for (const taskList of project.tasks) {
      for (const task of taskList.tasks) {
        allTasks.push({
          ...task,
          projectId: project.id,
          projectName: project.name,
          sessionId: taskList.sessionId,
          agentId: taskList.agentId,
        });
      }
    }
  }

  return c.json(allTasks);
});

// GET /api/tasks/:sessionId — tasks for a session
app.get('/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const index = await getIndex();

  for (const project of index.projects) {
    const taskList = project.tasks.find(t => t.sessionId === sessionId);
    if (taskList) {
      return c.json(taskList);
    }
  }

  return c.json({ sessionId, tasks: [] });
});

export default app;
