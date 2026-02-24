import type { TaskList, Task } from '../shared/types';

export async function parseTodoFile(filePath: string, fileName: string): Promise<TaskList> {
  const text = await Bun.file(filePath).text();
  const data = JSON.parse(text);

  // Extract session/agent IDs from filename
  // Format: {sessionId}-agent-{agentId}.json
  const parts = fileName.replace('.json', '').split('-agent-');
  const sessionId = parts[0] || '';
  const agentId = parts[1] || undefined;

  const tasks: Task[] = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === 'object') {
        tasks.push({
          id: item.id || String(tasks.length),
          subject: item.subject || item.title || 'Untitled',
          description: item.description || undefined,
          status: item.status || 'pending',
          blocks: Array.isArray(item.blocks) ? item.blocks : [],
          blockedBy: Array.isArray(item.blockedBy) ? item.blockedBy : [],
          metadata: item.metadata || {},
        });
      }
    }
  }

  return { sessionId, agentId, tasks };
}
