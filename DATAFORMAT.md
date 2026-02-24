# Claude Code Data Format Documentation

Documentation of the `~/.claude/` directory structure as discovered from real data.

## Directory Structure

```
~/.claude/
├── settings.json           # User preferences
├── stats-cache.json        # Aggregated analytics cache
├── history.jsonl           # Global prompt history
├── credentials.json        # Encrypted credentials (never read by clarc)
├── mcp-needs-auth-cache.json
├── projects/               # Per-project session data
│   └── [encoded-path]/     # URL-encoded project path
│       ├── [session-uuid].jsonl        # Session messages
│       └── [session-uuid]/
│           └── subagents/
│               └── agent-[agent-id].jsonl  # Sub-agent conversations
├── todos/                  # Task/todo storage
│   └── [session-uuid]-agent-[session-uuid].json
├── plans/                  # Plan markdown files
├── debug/                  # Debug logs (text files)
├── session-env/            # Session environment snapshots
├── cache/                  # Temporary data
├── downloads/
├── paste-cache/
├── backups/
└── shell-snapshots/
```

## Project Path Encoding

Project directories use a path-encoded name: `/mnt/e/my_project` becomes `-mnt-e-my-project`.

## Session JSONL Format

Each line is a JSON object. Message types:

### `type: "user"` — User messages
```json
{
  "parentUuid": "uuid-or-null",
  "isSidechain": false,
  "userType": "external",
  "cwd": "/working/directory",
  "sessionId": "uuid",
  "version": "2.1.50",
  "gitBranch": "HEAD",
  "type": "user",
  "message": {
    "role": "user",
    "content": "string or array of content blocks"
  },
  "uuid": "message-uuid",
  "timestamp": "2026-02-22T22:54:09.554Z",
  "isMeta": false,
  "slug": "human-readable-slug",
  "todos": [],
  "toolUseResult": "optional — present when this is a tool result delivery",
  "sourceToolAssistantUUID": "optional — uuid of the assistant message that made the tool call"
}
```

### `type: "assistant"` — Assistant responses
```json
{
  "parentUuid": "uuid",
  "isSidechain": false,
  "type": "assistant",
  "message": {
    "model": "claude-opus-4-6",
    "id": "msg_xxxxx",
    "type": "message",
    "role": "assistant",
    "content": [
      {"type": "thinking", "thinking": "...", "signature": "..."},
      {"type": "text", "text": "..."},
      {"type": "tool_use", "id": "toolu_xxx", "name": "ToolName", "input": {}},
      {"type": "tool_result", "content": "...", "tool_use_id": "toolu_xxx"}
    ],
    "stop_reason": "tool_use | end_turn",
    "usage": {
      "input_tokens": 3,
      "output_tokens": 11,
      "cache_creation_input_tokens": 10805,
      "cache_read_input_tokens": 18719,
      "cache_creation": {
        "ephemeral_5m_input_tokens": 0,
        "ephemeral_1h_input_tokens": 10805
      },
      "service_tier": "standard"
    }
  },
  "requestId": "req_xxxxx",
  "uuid": "uuid",
  "timestamp": "2026-02-22T22:54:23.284Z"
}
```

### `type: "file-history-snapshot"` — File tracking
```json
{
  "type": "file-history-snapshot",
  "messageId": "uuid",
  "snapshot": {
    "messageId": "uuid",
    "trackedFileBackups": {},
    "timestamp": "ISO-8601"
  },
  "isSnapshotUpdate": false
}
```

### `type: "queue-operation"` — Sub-agent lifecycle
```json
{
  "type": "queue-operation",
  "operation": "enqueue | remove",
  "timestamp": "ISO-8601",
  "sessionId": "parent-session-uuid",
  "content": "{\"task_id\":\"agent-id\",\"tool_use_id\":\"...\",\"description\":\"...\",\"task_type\":\"local_agent\"}"
}
```

### `type: "progress"` — Sub-agent progress
Contains nested message data for sub-agent progress updates. Includes `slug` and `data.message` fields.

## Content Block Types

- `thinking` — Extended thinking with `signature` field
- `text` — Regular text content
- `tool_use` — Tool invocation with `id`, `name`, `input`
- `tool_result` — Tool response with `tool_use_id`, `content`

## Content Polymorphism

`message.content` can be:
- A **string** (simple text message)
- An **array of content blocks** (structured message)

## Sub-agent Files

Located at: `projects/[projectId]/[sessionId]/subagents/agent-[agentId].jsonl`

Sub-agent messages have:
- `isSidechain: true`
- `agentId` field
- `slug` field (human-readable name)
- Same `sessionId` as parent

## Todo Files

Located at: `todos/[sessionId]-agent-[sessionId].json`

Content: JSON array of task objects (often empty `[]`).

## stats-cache.json Schema

```json
{
  "version": 1,
  "lastComputedDate": "2026-02-21",
  "dailyActivity": [{"date": "...", "messageCount": 0, "sessionCount": 0, "toolCallCount": 0}],
  "dailyModelTokens": [{"date": "...", "tokensByModel": {"model-name": 12345}}],
  "modelUsage": {"model-name": {"inputTokens": 0, "outputTokens": 0, "cacheReadInputTokens": 0, "cacheCreationInputTokens": 0, "webSearchRequests": 0, "costUSD": 0}},
  "totalSessions": 4,
  "totalMessages": 239,
  "longestSession": {"sessionId": "uuid", "duration": 118585769, "messageCount": 117, "timestamp": "ISO-8601"},
  "firstSessionDate": "ISO-8601",
  "hourCounts": {"6": 1, "8": 1}
}
```

## history.jsonl Schema

Each line:
```json
{
  "display": "/model Opus 4.5",
  "pastedContents": {},
  "timestamp": 1768362680678,
  "project": "/path/to/project",
  "sessionId": "uuid"
}
```

## settings.json Schema

```json
{
  "model": "opus",
  "syntaxHighlightingDisabled": false
}
```
