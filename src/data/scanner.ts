import { readdir, stat, readFile } from 'fs/promises';
import { join, basename } from 'path';
import { PROJECTS_DIR, TODOS_DIR, HISTORY_FILE, STATS_FILE } from '../shared/paths';
import type { ClarcIndex, Project, SessionRef, AgentRef, TaskList, GlobalStats, PromptEntry } from '../shared/types';
import { parseTodoFile } from './tasks';
import { readStatsCache } from './stats';

let cachedIndex: ClarcIndex | null = null;

export async function getIndex(): Promise<ClarcIndex> {
  if (cachedIndex) return cachedIndex;
  return reindex();
}

export async function reindex(): Promise<ClarcIndex> {
  const [projects, globalStats, promptHistory] = await Promise.all([
    scanProjects(),
    readStatsCache().catch(() => null),
    readPromptHistory().catch(() => []),
  ]);

  cachedIndex = {
    projects,
    globalStats,
    promptHistory,
    lastIndexedAt: new Date(),
  };

  return cachedIndex;
}

function decodeProjectPath(encoded: string): string {
  // Encoding replaces / with - and special chars
  // First char is always - (for the leading /)
  // Pattern: -mnt-e-jb-desktop--PersonalDocs... → /mnt/e/jb_desktop_/PersonalDocs...
  // We can't perfectly reverse-engineer _ vs - etc., so return the encoded form
  // But we can try: dashes become / except doubled dashes which become a literal dash in the segment
  // Actually the encoding is: path.replace(/\//g, '-') but also replaces some chars
  // For display, let's do our best: split on single dashes, join with /
  // Double-dashes in original path become -- in encoded form

  // Better approach: the encoded path replaces / with -
  // But segments containing - get those preserved as -
  // We can't perfectly reverse this, so just return the encoded as-is for the path
  // and extract a nice name from the last segment
  return encoded;
}

function extractProjectName(encoded: string): string {
  // Take the last meaningful segment
  const parts = encoded.split('-').filter(Boolean);
  // Last non-empty part is typically the project name
  return parts[parts.length - 1] || encoded;
}

async function scanProjects(): Promise<Project[]> {
  const projects: Project[] = [];

  let projectDirs: string[];
  try {
    projectDirs = await readdir(PROJECTS_DIR);
  } catch {
    return [];
  }

  for (const dirName of projectDirs) {
    try {
      const projectPath = join(PROJECTS_DIR, dirName);
      const dirStat = await stat(projectPath);
      if (!dirStat.isDirectory()) continue;

      const project = await scanProject(dirName, projectPath);
      projects.push(project);
    } catch (err) {
      console.warn(`Warning: failed to scan project ${dirName}:`, err);
    }
  }

  // Sort by last active
  projects.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
  return projects;
}

async function scanProject(id: string, projectPath: string): Promise<Project> {
  const entries = await readdir(projectPath);
  const sessions: SessionRef[] = [];
  const agents: AgentRef[] = [];
  let lastActiveAt = new Date(0);
  let messageCount = 0;

  for (const entry of entries) {
    const entryPath = join(projectPath, entry);

    // Session JSONL files (UUIDs)
    if (entry.endsWith('.jsonl') && !entry.startsWith('agent-')) {
      try {
        const sessionId = entry.replace('.jsonl', '');
        const fileStat = await stat(entryPath);
        const ref = await scanSessionRef(sessionId, id, entryPath, fileStat);
        sessions.push(ref);

        if (fileStat.mtime > lastActiveAt) {
          lastActiveAt = fileStat.mtime;
        }
        if (ref.messageCount) {
          messageCount += ref.messageCount;
        }

        // Check for sub-agents in session directory
        const sessionDir = join(projectPath, sessionId, 'subagents');
        try {
          const subagentFiles = await readdir(sessionDir);
          for (const agentFile of subagentFiles) {
            if (agentFile.startsWith('agent-') && agentFile.endsWith('.jsonl')) {
              const agentId = agentFile.replace('agent-', '').replace('.jsonl', '');
              const agentRef: AgentRef = {
                agentId,
                filePath: join(sessionDir, agentFile),
                parentSessionId: sessionId,
                projectId: id,
              };
              agents.push(agentRef);
              ref.agents.push(agentRef);
            }
          }
        } catch {
          // No subagents directory — that's fine
        }
      } catch (err) {
        console.warn(`Warning: failed to scan session ${entry}:`, err);
      }
    }
  }

  // Sort sessions by modified date (newest first)
  sessions.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

  // Load tasks for this project's sessions
  const tasks = await loadProjectTasks(sessions.map(s => s.id));

  return {
    id,
    path: decodeProjectPath(id),
    name: extractProjectName(id),
    sessions,
    agents,
    tasks,
    lastActiveAt,
    messageCount,
  };
}

async function scanSessionRef(
  sessionId: string,
  projectId: string,
  filePath: string,
  fileStat: { size: number; mtime: Date }
): Promise<SessionRef> {
  const ref: SessionRef = {
    id: sessionId,
    projectId,
    filePath,
    fileSize: fileStat.size,
    modifiedAt: fileStat.mtime,
    agents: [],
  };

  // Read first few lines to extract metadata
  try {
    const file = Bun.file(filePath);
    const text = await file.text();
    const lines = text.split('\n').filter(Boolean);

    ref.messageCount = lines.length;
    let firstUserMsg: string | undefined;

    for (const line of lines.slice(0, 20)) {
      try {
        const obj = JSON.parse(line);

        if (obj.type === 'user' && obj.message) {
          if (!ref.slug && obj.slug) ref.slug = obj.slug;
          if (!ref.version && obj.version) ref.version = obj.version;
          if (!ref.gitBranch && obj.gitBranch) ref.gitBranch = obj.gitBranch;

          // Extract summary from first real user message
          if (!firstUserMsg && !obj.isMeta) {
            const content = obj.message.content;
            if (typeof content === 'string') {
              firstUserMsg = content;
            } else if (Array.isArray(content)) {
              const textBlock = content.find((b: any) => b.type === 'text');
              if (textBlock?.text) firstUserMsg = textBlock.text;
            }
          }
        }

        if (obj.type === 'assistant' && obj.message?.model) {
          if (!ref.model) ref.model = obj.message.model;
        }
      } catch {
        // skip malformed lines
      }
    }

    if (firstUserMsg) {
      // Clean up command messages
      firstUserMsg = firstUserMsg.replace(/<command-message>.*?<\/command-message>/g, '').trim();
      firstUserMsg = firstUserMsg.replace(/<command-name>.*?<\/command-name>/g, '').trim();
      ref.summary = firstUserMsg.slice(0, 200);
    }
  } catch (err) {
    console.warn(`Warning: failed to read session metadata for ${sessionId}:`, err);
  }

  return ref;
}

async function loadProjectTasks(sessionIds: string[]): Promise<TaskList[]> {
  const tasks: TaskList[] = [];

  try {
    const todoFiles = await readdir(TODOS_DIR);
    for (const file of todoFiles) {
      if (!file.endsWith('.json')) continue;

      // Check if this todo belongs to one of our sessions
      const matchesProject = sessionIds.some(id => file.includes(id));
      if (!matchesProject) continue;

      try {
        const filePath = join(TODOS_DIR, file);
        const taskList = await parseTodoFile(filePath, file);
        if (taskList.tasks.length > 0) {
          tasks.push(taskList);
        }
      } catch {
        // skip malformed todo files
      }
    }
  } catch {
    // No todos directory
  }

  return tasks;
}

async function readPromptHistory(): Promise<PromptEntry[]> {
  const entries: PromptEntry[] = [];

  try {
    const text = await Bun.file(HISTORY_FILE).text();
    for (const line of text.split('\n').filter(Boolean)) {
      try {
        const obj = JSON.parse(line);
        entries.push({
          display: obj.display || '',
          pastedContents: obj.pastedContents || {},
          timestamp: obj.timestamp || 0,
          project: obj.project || '',
          sessionId: obj.sessionId || '',
        });
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // No history file
  }

  return entries;
}
