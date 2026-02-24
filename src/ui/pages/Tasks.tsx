import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { CheckSquareIcon } from '../components/Icons';
import { Skeleton } from '../components/Skeleton';

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

const STATUS_COLORS = {
  pending: 'var(--color-text-muted)',
  in_progress: 'var(--color-primary)',
  done: 'var(--color-accent-emerald)',
  completed: 'var(--color-accent-emerald)',
};

function TasksSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <Skeleton variant="title" width="20%" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {[1, 2, 3].map(i => (
          <div key={i}>
            <Skeleton variant="text" width="40%" />
            <div className="mt-3 space-y-2">
              <Skeleton variant="card" height={80} />
              <Skeleton variant="card" height={80} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Tasks() {
  const { data: tasks, loading } = useApi<TaskEntry[]>('/tasks');

  if (loading) return <TasksSkeleton />;

  const allTasks = tasks || [];
  const pending = allTasks.filter(t => t.status === 'pending');
  const inProgress = allTasks.filter(t => t.status === 'in_progress');
  const done = allTasks.filter(t => t.status === 'done' || t.status === 'completed');

  if (allTasks.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 text-gradient">Tasks</h1>
        <EmptyState
          icon={<CheckSquareIcon size={32} />}
          title="No tasks found"
          description="Tasks created during Claude Code sessions will appear here."
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gradient">Tasks</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TaskColumn title="Pending" tasks={pending} color={STATUS_COLORS.pending} />
        <TaskColumn title="In Progress" tasks={inProgress} color={STATUS_COLORS.in_progress} />
        <TaskColumn title="Done" tasks={done} color={STATUS_COLORS.done} />
      </div>
    </div>
  );
}

function TaskColumn({ title, tasks, color }: { title: string; tasks: TaskEntry[]; color: string }) {
  return (
    <div>
      {/* Column header with colored top border */}
      <div
        className="flex items-center gap-2 mb-3 pb-2"
        style={{ borderTop: `3px solid ${color}`, paddingTop: 8 }}
      >
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{title}</h2>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({tasks.length})</span>
      </div>

      <div className="space-y-2 stagger-children">
        {tasks.map(task => (
          <div
            key={`${task.sessionId}-${task.id}`}
            className="card"
            style={{ borderLeft: `3px solid ${color}` }}
          >
            <div className="p-3">
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
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-accent-rose)' }}>
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--color-accent-rose)',
                        animation: 'pulse-subtle 2s infinite',
                      }}
                    />
                    blocked by {task.blockedBy.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
