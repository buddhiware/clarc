import type {
  Session, Message, ContentBlock, ThinkingBlock, ToolCall,
  SessionMetadata, TokenUsage, AgentRef,
} from '../shared/types';
import { estimateCost } from '../shared/pricing';

// LRU cache for parsed sessions
const sessionCache = new Map<string, { session: Session; parsedAt: number }>();
const MAX_CACHE_SIZE = 50;

export async function parseSession(
  filePath: string,
  sessionId: string,
  projectId: string
): Promise<Session> {
  // Check cache
  const cached = sessionCache.get(sessionId);
  if (cached) return cached.session;

  const text = await Bun.file(filePath).text();
  const lines = text.split('\n').filter(Boolean);

  const messages: Message[] = [];
  const agents: AgentRef[] = [];
  const tokenUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0 };
  let totalCost = 0;
  let firstModel: string | undefined;
  let slug: string | undefined;
  let gitBranch: string | undefined;
  let cwd: string | undefined;
  let version: string | undefined;
  let startedAt: Date | undefined;
  let endedAt: Date | undefined;

  for (const line of lines) {
    try {
      const raw = JSON.parse(line);

      // Extract queue-operation for sub-agent linking
      if (raw.type === 'queue-operation' && raw.operation === 'enqueue') {
        try {
          const content = typeof raw.content === 'string' ? JSON.parse(raw.content) : raw.content;
          if (content.task_id) {
            agents.push({
              agentId: content.task_id,
              filePath: '', // resolved by scanner
              parentSessionId: sessionId,
              projectId,
              description: content.description,
            });
          }
        } catch { /* malformed content */ }
      }

      // Skip non-message types for the message list
      if (raw.type === 'file-history-snapshot' || raw.type === 'queue-operation') {
        continue;
      }

      // Progress messages — skip for message display but could be used for tracking
      if (raw.type === 'progress') {
        continue;
      }

      const msg = parseMessage(raw, line);
      if (!msg) continue;

      messages.push(msg);

      // Track metadata
      if (!slug && raw.slug) slug = raw.slug;
      if (!gitBranch && raw.gitBranch) gitBranch = raw.gitBranch;
      if (!cwd && raw.cwd) cwd = raw.cwd;
      if (!version && raw.version) version = raw.version;

      if (msg.timestamp) {
        if (!startedAt || msg.timestamp < startedAt) startedAt = msg.timestamp;
        if (!endedAt || msg.timestamp > endedAt) endedAt = msg.timestamp;
      }

      // Accumulate token usage from assistant messages
      if (msg.type === 'assistant' && msg.tokenUsage) {
        tokenUsage.inputTokens += msg.tokenUsage.inputTokens;
        tokenUsage.outputTokens += msg.tokenUsage.outputTokens;
        tokenUsage.cacheReadTokens += msg.tokenUsage.cacheReadTokens;
        tokenUsage.cacheCreateTokens += msg.tokenUsage.cacheCreateTokens;
      }

      if (msg.model && !firstModel) firstModel = msg.model;
      if (msg.costUsd) totalCost += msg.costUsd;
    } catch (err) {
      console.warn(`Warning: failed to parse line in ${sessionId}:`, err);
    }
  }

  // If no per-message cost was calculated, estimate from total tokens
  if (totalCost === 0 && firstModel) {
    totalCost = estimateCost(firstModel, tokenUsage);
  }

  const metadata: SessionMetadata = {
    slug,
    model: firstModel,
    gitBranch,
    cwd,
    version,
    startedAt,
    endedAt,
    durationMs: startedAt && endedAt ? endedAt.getTime() - startedAt.getTime() : undefined,
    totalMessages: messages.length,
    tokenUsage,
    estimatedCostUsd: totalCost,
  };

  const session: Session = {
    id: sessionId,
    projectId,
    messages,
    agents,
    metadata,
  };

  // Cache it
  if (sessionCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest
    const oldestKey = sessionCache.keys().next().value;
    if (oldestKey) sessionCache.delete(oldestKey);
  }
  sessionCache.set(sessionId, { session, parsedAt: Date.now() });

  return session;
}

function parseMessage(raw: any, line: string): Message | null {
  const type = raw.type;
  if (!type || type === 'file-history-snapshot' || type === 'queue-operation' || type === 'progress') {
    return null;
  }

  const msg = raw.message;
  let role: Message['role'] = 'user';
  let content: ContentBlock[] = [];
  let thinking: ThinkingBlock[] = [];
  let model: string | undefined;
  let tokenUsage: TokenUsage | undefined;
  let costUsd: number | undefined;
  let toolCalls: ToolCall[] = [];

  if (type === 'assistant' && msg) {
    role = 'assistant';
    model = msg.model;

    // Parse content blocks
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'thinking') {
          thinking.push({
            type: 'thinking',
            thinking: block.thinking || '',
            signature: block.signature,
          });
        } else if (block.type === 'tool_use') {
          content.push(block);
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input,
          });
        } else {
          content.push(block);
        }
      }
    } else if (typeof msg.content === 'string') {
      content = [{ type: 'text', text: msg.content }];
    }

    // Extract token usage
    if (msg.usage) {
      tokenUsage = {
        inputTokens: msg.usage.input_tokens || 0,
        outputTokens: msg.usage.output_tokens || 0,
        cacheReadTokens: msg.usage.cache_read_input_tokens || 0,
        cacheCreateTokens: msg.usage.cache_creation_input_tokens || 0,
      };

      if (model) {
        costUsd = estimateCost(model, tokenUsage);
      }
    }
  } else if (type === 'user' && msg) {
    role = 'user';

    // Content can be string or array
    if (typeof msg.content === 'string') {
      content = [{ type: 'text', text: msg.content }];
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'tool_result') {
          role = 'tool';
        }
        content.push(block);
      }
    }
  }

  return {
    uuid: raw.uuid || '',
    parentUuid: raw.parentUuid || null,
    type,
    role,
    content,
    thinking: thinking.length > 0 ? thinking : undefined,
    timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
    model,
    tokenUsage,
    costUsd,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    gitBranch: raw.gitBranch,
    cwd: raw.cwd,
    sessionId: raw.sessionId,
    version: raw.version,
    slug: raw.slug,
    isSidechain: raw.isSidechain,
    isMeta: raw.isMeta,
    rawLine: line,
    toolUseResult: raw.toolUseResult,
    sourceToolAssistantUUID: raw.sourceToolAssistantUUID,
    agentId: raw.agentId,
  };
}

// Pair tool_use calls with their tool_result responses
export function pairToolCalls(messages: Message[]): Message[] {
  const toolResults = new Map<string, any>();

  // First pass: collect tool results
  for (const msg of messages) {
    if (msg.role === 'tool' && msg.content) {
      for (const block of msg.content) {
        if (block.type === 'tool_result' && block.tool_use_id) {
          toolResults.set(block.tool_use_id, block.content);
        }
      }
    }
  }

  // Second pass: pair with tool_use calls
  for (const msg of messages) {
    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        if (toolResults.has(tc.id)) {
          tc.result = toolResults.get(tc.id);
          const resultContent = tc.result;
          if (typeof resultContent === 'string' && resultContent.startsWith('Error:')) {
            tc.isError = true;
          }
        }
      }
    }
  }

  return messages;
}
