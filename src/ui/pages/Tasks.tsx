import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';

interface TaskEntry {
  id: string;
  subject: string;
  description?: string;
  status: string;
  blocks: string[];
  blockedBy: string[];
  projectId: string;
  projectName: string;
  sessionId: string;
}

export default function Tasks() {
  const { data: tasks, loading } = useApi<TaskEntry[]>('/tasks');

  if (loading) return <div className="p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading tasks...</div>;

  const allTasks = tasks || [];
  const pending = allTasks.filter(t => t.status === 'pending');
  const inProgress = allTasks.filter(t => t.status === 'in_progress');
  const done = allTasks.filter(t => t.status === 'done' || t.status === 'completed');

  if (allTasks.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Tasks</h1>
        <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          <p className="text-lg mb-2">No tasks found</p>
          <p className="text-sm">Tasks created during Claude Code sessions will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>Tasks</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TaskColumn title="Pending" tasks={pending} color="var(--color-text-muted)" />
        <TaskColumn title="In Progress" tasks={inProgress} color="var(--color-primary)" />
        <TaskColumn title="Done" tasks={done} color="#22c55e" />
      </div>
    </div>
  );
}

function TaskColumn({ title, tasks, color }: { title: string; tasks: TaskEntry[]; color: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{title}</h2>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({tasks.length})</span>
      </div>
      <div className="space-y-2">
        {tasks.map(task => (
          <div
            key={`${task.sessionId}-${task.id}`}
            className="p-3 rounded-lg border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>{task.subject}</div>
            {task.description && (
              <div className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                {task.description}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Link
                to={`/projects/${encodeURIComponent(task.projectId)}`}
                className="text-xs hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                {task.projectName}
              </Link>
              {task.blockedBy.length > 0 && (
                <span className="text-xs" style={{ color: 'var(--color-error-border)' }}>
                  blocked by {task.blockedBy.length}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
