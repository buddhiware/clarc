import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import SessionTimeline from '../components/SessionTimeline';
import Badge from '../components/Badge';
import { Skeleton, SkeletonGroup } from '../components/Skeleton';
import { CopyIcon, CheckIcon } from '../components/Icons';
import { useState } from 'react';

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

function ProjectSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Skeleton variant="title" width="40%" />
      <Skeleton variant="text" width="70%" />
      <div className="flex gap-3 mt-3 mb-8">
        {[1, 2, 3].map(i => <Skeleton key={i} variant="text" width="80px" />)}
      </div>
      <SkeletonGroup count={4} />
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: project, loading, error } = useApi<ProjectData>(`/projects/${id}`);
  const [pathCopied, setPathCopied] = useState(false);

  if (loading) return <ProjectSkeleton />;
  if (error) return <div className="p-6 text-sm" style={{ color: 'var(--color-accent-rose)' }}>Error: {error}</div>;
  if (!project) return <div className="p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>Project not found</div>;

  const handleCopyPath = async () => {
    await navigator.clipboard.writeText(project.path);
    setPathCopied(true);
    setTimeout(() => setPathCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with gradient blob */}
      <div className="relative mb-8 overflow-hidden">
        <div
          className="absolute -top-20 -left-20 w-64 h-64 rounded-full"
          style={{ background: 'var(--gradient-hero)', opacity: 0.06, filter: 'blur(50px)' }}
        />

        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{project.name}</h1>

        {/* Path as code pill */}
        <div className="flex items-center gap-2 mt-2">
          <span
            className="text-xs font-mono px-2.5 py-1 rounded-lg inline-flex items-center gap-2"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
          >
            {project.path}
            <button onClick={handleCopyPath} className="btn-ghost p-0.5 rounded">
              {pathCopied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            </button>
          </span>
        </div>

        {/* Stat pills */}
        <div className="flex gap-2 mt-3">
          <Badge variant="primary">{project.sessions.length} sessions</Badge>
          <Badge variant="default">{project.messageCount} messages</Badge>
          <Badge variant="default">{project.agents.length} sub-agents</Badge>
        </div>
      </div>

      {/* Session timeline */}
      <SessionTimeline
        sessions={project.sessions}
        agents={project.agents}
        projectId={project.id}
      />
    </div>
  );
}
