import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from './useApi';

interface ProjectData {
  sessions: { id: string }[];
}

/**
 * Enables [ and ] keyboard shortcuts to navigate between sessions
 * within the same project.
 */
export function useSessionNavigation(projectId: string, currentSessionId: string) {
  const navigate = useNavigate();
  const { data: project } = useApi<ProjectData>(`/projects/${encodeURIComponent(projectId)}`);

  useEffect(() => {
    if (!project?.sessions) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const idx = project.sessions.findIndex(s => s.id === currentSessionId);
      if (idx === -1) return;

      if (e.key === '[' && idx > 0) {
        e.preventDefault();
        navigate(`/sessions/${project.sessions[idx - 1].id}`);
      } else if (e.key === ']' && idx < project.sessions.length - 1) {
        e.preventDefault();
        navigate(`/sessions/${project.sessions[idx + 1].id}`);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [project, currentSessionId, navigate]);
}
