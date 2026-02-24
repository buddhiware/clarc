import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

interface SessionInfo {
  id: string;
  summary: string;
  messageCount: number;
  model: string;
  gitBranch: string;
  slug: string;
  modifiedAt: string;
  fileSize: number;
  agentCount: number;
}

interface ProjectData {
  id: string;
  name: string;
  path: string;
  lastActiveAt: string;
  messageCount: number;
  sessions: SessionInfo[];
  agents: { agentId: string; parentSessionId: string; description?: string }[];
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: project, loading, error } = useApi<ProjectData>(`/projects/${id}`);

  if (loading) return <div className="p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading...</div>;
  if (error) return <div className="p-6 text-sm text-red-500">Error: {error}</div>;
  if (!project) return <div className="p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>Project not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{project.name}</h1>
        <p className="text-sm mt-1 font-mono" style={{ color: 'var(--color-text-muted)' }}>{project.path}</p>
        <div className="flex gap-4 mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <span>{project.sessions.length} sessions</span>
          <span>{project.messageCount} messages</span>
          <span>{project.agents.length} sub-agents</span>
        </div>
      </div>

      {/* Session timeline */}
      <div className="space-y-3">
        {project.sessions.map((session) => {
          const sessionAgents = project.agents.filter(a => a.parentSessionId === session.id);
          return (
            <div key={session.id}>
              <Link
                to={`/sessions/${session.id}`}
                className="block p-4 rounded-lg border transition-all hover:border-[var(--color-primary)]"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                      {session.summary || session.slug || `Session ${session.id.slice(0, 8)}`}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {session.model && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-mono"
                          style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                          {session.model.replace('claude-', '').split('-').slice(0, 2).join('-')}
                        </span>
                      )}
                      {session.gitBranch && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                          {session.gitBranch}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {session.messageCount} msgs
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {(session.fileSize / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-right whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(session.modifiedAt).toLocaleDateString()}
                    <br />
                    {new Date(session.modifiedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              </Link>

              {/* Sub-agents nested under their parent session */}
              {sessionAgents.length > 0 && (
                <div className="ml-6 mt-1 space-y-1">
                  {sessionAgents.map(agent => (
                    <div
                      key={agent.agentId}
                      className="flex items-center gap-2 px-3 py-1.5 rounded text-xs border-l-2"
                      style={{ borderColor: 'var(--color-primary)', backgroundColor: 'var(--color-surface)' }}
                    >
                      <span style={{ color: 'var(--color-primary)' }}>agent</span>
                      <span className="font-mono" style={{ color: 'var(--color-text-muted)' }}>{agent.agentId.slice(0, 8)}</span>
                      {agent.description && (
                        <span style={{ color: 'var(--color-text-muted)' }}>&middot; {agent.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
