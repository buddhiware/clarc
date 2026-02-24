// ============================================================
// Index & Project types
// ============================================================

export interface ClarcIndex {
  projects: Project[];
  globalStats: GlobalStats | null;
  promptHistory: PromptEntry[];
  lastIndexedAt: Date;
}

export interface Project {
  id: string;                     // encoded directory name
  path: string;                   // decoded real path
  name: string;                   // last path segment
  sessions: SessionRef[];
  agents: AgentRef[];
  tasks: TaskList[];
  lastActiveAt: Date;
  messageCount: number;
}

export interface SessionRef {
  id: string;                     // UUID from filename
  projectId: string;
  filePath: string;
  fileSize: number;
  modifiedAt: Date;
  summary?: string;               // first user message text
  messageCount?: number;
  model?: string;
  gitBranch?: string;
  slug?: string;
  version?: string;
  startedAt?: Date;               // timestamp of first message
  agents: AgentRef[];             // sub-agents for this session
  tokenUsage?: TokenUsage;        // aggregated from all assistant messages
  estimatedCostUsd?: number;      // computed from tokenUsage
}

export interface AgentRef {
  agentId: string;                // e.g., "a037d13a18000bcdd"
  filePath: string;
  parentSessionId: string;
  projectId: string;
  description?: string;           // from queue-operation enqueue
}

// ============================================================
// Parsed Session types
// ============================================================

export interface Session {
  id: string;
  projectId: string;
  messages: Message[];
  agents: AgentRef[];
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  slug?: string;
  model?: string;
  gitBranch?: string;
  cwd?: string;
  version?: string;
  startedAt?: Date;
  endedAt?: Date;
  durationMs?: number;
  totalMessages: number;
  tokenUsage: TokenUsage;
  estimatedCostUsd: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
}

export interface Message {
  uuid: string;
  parentUuid: string | null;
  type: string;                   // user, assistant, file-history-snapshot, queue-operation, progress
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: ContentBlock[];
  thinking?: ThinkingBlock[];
  timestamp: Date;
  model?: string;
  tokenUsage?: TokenUsage;
  costUsd?: number;
  toolCalls?: ToolCall[];
  gitBranch?: string;
  cwd?: string;
  sessionId?: string;
  version?: string;
  slug?: string;
  isSidechain?: boolean;
  isMeta?: boolean;
  rawLine: string;                // original JSON for Raw view
  // Extra fields preserved
  toolUseResult?: string;
  sourceToolAssistantUUID?: string;
  agentId?: string;
}

export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
  signature?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
  result?: any;
  isError?: boolean;
}

export interface ContentBlock {
  type: string;                   // text, tool_use, tool_result, image, etc.
  text?: string;
  id?: string;                    // tool_use id
  name?: string;                  // tool name
  input?: any;
  content?: any;                  // tool_result content
  tool_use_id?: string;
  [key: string]: any;
}

// ============================================================
// Tasks
// ============================================================

export interface TaskList {
  sessionId: string;
  agentId?: string;
  tasks: Task[];
}

export interface Task {
  id: string;
  subject: string;
  description?: string;
  status: string;
  blocks: string[];
  blockedBy: string[];
  metadata: Record<string, any>;
}

// ============================================================
// Stats / Analytics
// ============================================================

export interface GlobalStats {
  version: number;
  lastComputedDate: string;
  dailyActivity: DailyActivity[];
  dailyModelTokens: DailyModelTokens[];
  modelUsage: Record<string, ModelUsageEntry>;
  totalSessions: number;
  totalMessages: number;
  longestSession: {
    sessionId: string;
    duration: number;
    messageCount: number;
    timestamp: string;
  };
  firstSessionDate: string;
  hourCounts: Record<string, number>;
}

export interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

export interface DailyModelTokens {
  date: string;
  tokensByModel: Record<string, number>;
}

export interface ModelUsageEntry {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests: number;
  costUSD: number;
  contextWindow: number;
  maxOutputTokens: number;
}

export interface Analytics {
  totalSessions: number;
  totalMessages: number;
  firstSessionDate: string;
  dailyActivity: DailyActivity[];
  modelUsage: Record<string, ModelUsageEntry>;
  hourCounts: Record<string, number>;
  longestSession: { sessionId: string; duration: number; messageCount: number };
  costByDay: { date: string; costUsd: number }[];
  costByModel: Record<string, number>;
  costByProject: Record<string, number>;
  tokensByDay: { date: string; input: number; output: number }[];
  topProjects: { name: string; sessions: number; messages: number; cost: number }[];
  activityHeatmap: { day: number; hour: number; count: number }[];
}

// ============================================================
// Prompt history (from history.jsonl)
// ============================================================

export interface PromptEntry {
  display: string;
  pastedContents: Record<string, any>;
  timestamp: number;
  project: string;
  sessionId: string;
}

// ============================================================
// Search
// ============================================================

export interface SearchResult {
  sessionId: string;
  projectId: string;
  projectName: string;
  messageUuid: string;
  type: string;
  snippet: string;
  timestamp: Date;
  model?: string;
  score?: number;
}

// ============================================================
// Data Sync
// ============================================================

export interface SyncState {
  version: 1;
  lastSyncAt: string;
  lastSyncDurationMs: number;
  syncCount: number;
  sourceDir: string;
  fileInventory: Record<string, SyncedFile>;
  errors: SyncError[];
}

export interface SyncedFile {
  relativePath: string;
  sourceMtimeMs: number;
  sourceSizeBytes: number;
  syncedAt: string;
}

export interface SyncError {
  timestamp: string;
  relativePath: string;
  error: string;
}

export interface SyncStatus {
  lastSyncAt: string | null;
  lastSyncDurationMs: number;
  syncCount: number;
  sourceDir: string;
  totalFiles: number;
  totalSizeBytes: number;
  errors: SyncError[];
  isSyncing: boolean;
}
