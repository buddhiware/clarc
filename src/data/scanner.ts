import { readdir, stat, readFile } from 'fs/promises';
import { join, basename } from 'path';
import { PROJECTS_DIR, TODOS_DIR, HISTORY_FILE, STATS_FILE } from '../shared/paths';
import type { ClarcIndex, Project, SessionRef, AgentRef, TaskList, GlobalStats, PromptEntry, TokenUsage } from '../shared/types';
import { parseTodoFile } from './tasks';
import { readStatsCache } from './stats';
import { estimateCost } from '../shared/pricing';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let cachedIndex: ClarcIndex | null = null;

export function invalidateCache(): void {
  cachedIndex = null;
}

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

  // Second pass: detect orphan session directories (UUID dirs with no matching .jsonl)
  const scannedIds = new Set(sessions.map(s => s.id));
  for (const entry of entries) {
    if (!UUID_RE.test(entry) || scannedIds.has(entry)) continue;
    try {
      const dirPath = join(projectPath, entry);
      const dirStat = await stat(dirPath);
      if (!dirStat.isDirectory()) continue;

      const ref = await scanOrphanSessionRef(entry, id, dirPath, dirStat);
      if (!ref) continue;

      sessions.push(ref);
      if (dirStat.mtime > lastActiveAt) {
        lastActiveAt = dirStat.mtime;
      }
      if (ref.messageCount) {
        messageCount += ref.messageCount;
      }
      for (const agent of ref.agents) {
        agents.push(agent);
      }
    } catch {
      // skip unreadable directories
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

    // Token usage aggregation (extracted from ALL assistant messages)
    const tokenUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0 };
    let hasUsageData = false;

    for (let i = 0; i < lines.length; i++) {
      try {
        const obj = JSON.parse(lines[i]);

        // Capture first timestamp as session start time
        if (!ref.startedAt && obj.timestamp) {
          ref.startedAt = new Date(obj.timestamp);
        }

        // Extract metadata from first 20 lines
        if (i < 20) {
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
        } else {
          // For lines beyond first 20, only check assistant messages for model
          if (!ref.model && obj.type === 'assistant' && obj.message?.model) {
            ref.model = obj.message.model;
          }
        }

        // Extract token usage from ALL assistant messages (fast: just check for usage object)
        if (obj.type === 'assistant' && obj.message?.usage) {
          const u = obj.message.usage;
          tokenUsage.inputTokens += u.input_tokens || 0;
          tokenUsage.outputTokens += u.output_tokens || 0;
          tokenUsage.cacheReadTokens += u.cache_read_input_tokens || 0;
          tokenUsage.cacheCreateTokens += u.cache_creation_input_tokens || 0;
          hasUsageData = true;
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

    // Store token usage and estimated cost
    if (hasUsageData) {
      ref.tokenUsage = tokenUsage;
      if (ref.model) {
        ref.estimatedCostUsd = estimateCost(ref.model, tokenUsage);
      }
    }
  } catch (err) {
    console.warn(`Warning: failed to read session metadata for ${sessionId}:`, err);
  }

  return ref;
}

async function scanOrphanSessionRef(
  sessionId: string,
  projectId: string,
  dirPath: string,
  dirStat: { mtime: Date },
): Promise<SessionRef | null> {
  const agentRefs: AgentRef[] = [];
  let toolResultCount = 0;
  let previewSnippet = '';

  // Count tool-results
  const toolResultsDir = join(dirPath, 'tool-results');
  try {
    const files = await readdir(toolResultsDir);
    const txtFiles = files.filter(f => f.endsWith('.txt')).sort();
    toolResultCount = txtFiles.length;

    // Read first file for preview snippet
    if (txtFiles.length > 0) {
      try {
        const firstFile = await readFile(join(toolResultsDir, txtFiles[0]), 'utf-8');
        previewSnippet = firstFile.slice(0, 100).replace(/\n/g, ' ').trim();
      } catch { /* skip unreadable */ }
    }
  } catch { /* no tool-results dir */ }

  // Check for subagents
  const subagentsDir = join(dirPath, 'subagents');
  try {
    const files = await readdir(subagentsDir);
    for (const f of files) {
      if (f.startsWith('agent-') && f.endsWith('.jsonl')) {
        const agentId = f.replace('agent-', '').replace('.jsonl', '');
        agentRefs.push({
          agentId,
          filePath: join(subagentsDir, f),
          parentSessionId: sessionId,
          projectId,
        });
      }
    }
  } catch { /* no subagents dir */ }

  if (toolResultCount === 0 && agentRefs.length === 0) return null;

  const summary = previewSnippet
    ? `${toolResultCount} tool result${toolResultCount !== 1 ? 's' : ''} — ${previewSnippet}`
    : `${toolResultCount} tool result${toolResultCount !== 1 ? 's' : ''}`;

  return {
    id: sessionId,
    projectId,
    filePath: dirPath,
    fileSize: 0,
    modifiedAt: dirStat.mtime,
    summary: summary.slice(0, 200),
    messageCount: toolResultCount,
    agents: agentRefs,
  };
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
