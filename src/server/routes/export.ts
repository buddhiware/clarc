import { Hono } from 'hono';
import { getIndex } from '../../data/scanner';
import { parseSession, pairToolCalls } from '../../data/parser';
import type { Session, Message } from '../../shared/types';

const app = new Hono();

// GET /api/export/session/:id — download session as markdown
app.get('/session/:id', async (c) => {
  const id = c.req.param('id');
  const includeThinking = c.req.query('thinking') !== 'false';
  const includeToolCalls = c.req.query('tools') !== 'false';
  const index = await getIndex();

  for (const project of index.projects) {
    const ref = project.sessions.find(s => s.id === id);
    if (ref) {
      const session = await parseSession(ref.filePath, ref.id, ref.projectId);
      pairToolCalls(session.messages);
      const md = sessionToMarkdown(session, project.name, { includeThinking, includeToolCalls });

      c.header('Content-Type', 'text/markdown; charset=utf-8');
      c.header('Content-Disposition', `attachment; filename="session-${id.slice(0, 8)}.md"`);
      return c.text(md);
    }
  }

  return c.json({ error: 'Session not found' }, 404);
});

// GET /api/export/session/:id/preview — markdown preview (raw markdown text)
app.get('/session/:id/preview', async (c) => {
  const id = c.req.param('id');
  const includeThinking = c.req.query('thinking') !== 'false';
  const includeToolCalls = c.req.query('tools') !== 'false';
  const index = await getIndex();

  for (const project of index.projects) {
    const ref = project.sessions.find(s => s.id === id);
    if (ref) {
      const session = await parseSession(ref.filePath, ref.id, ref.projectId);
      pairToolCalls(session.messages);
      const md = sessionToMarkdown(session, project.name, { includeThinking, includeToolCalls });
      return c.text(md);
    }
  }

  return c.json({ error: 'Session not found' }, 404);
});

function sessionToMarkdown(
  session: Session,
  projectName: string,
  opts: { includeThinking: boolean; includeToolCalls: boolean }
): string {
  const meta = session.metadata;
  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`title: "${meta.slug || `Session ${session.id.slice(0, 8)}`}"`);
  lines.push(`project: ${projectName}`);
  lines.push(`session_id: ${session.id}`);
  if (meta.model) lines.push(`model: ${meta.model}`);
  if (meta.gitBranch) lines.push(`git_branch: ${meta.gitBranch}`);
  if (meta.startedAt) lines.push(`started_at: ${meta.startedAt.toISOString()}`);
  if (meta.durationMs) lines.push(`duration_minutes: ${Math.round(meta.durationMs / 60000)}`);
  lines.push(`messages: ${meta.totalMessages}`);
  lines.push(`tokens: { input: ${meta.tokenUsage.inputTokens}, output: ${meta.tokenUsage.outputTokens} }`);
  lines.push(`estimated_cost_usd: ${meta.estimatedCostUsd.toFixed(4)}`);
  lines.push('---');
  lines.push('');

  // Title
  const title = meta.slug || session.messages.find(m => m.role === 'user')?.content[0]?.text?.slice(0, 80) || 'Session';
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`**Project:** ${projectName} | **Model:** ${meta.model || 'unknown'} | **Cost:** $${meta.estimatedCostUsd.toFixed(4)}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Messages
  for (const msg of session.messages) {
    if (msg.role === 'tool') continue; // tool results shown inline with assistant

    const time = msg.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    if (msg.role === 'user') {
      lines.push(`## User — ${time}`);
      lines.push('');
      for (const block of msg.content) {
        if (block.type === 'text' && block.text) {
          lines.push(block.text);
        }
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    } else if (msg.role === 'assistant') {
      lines.push(`## Assistant — ${time}`);
      lines.push('');

      // Thinking blocks
      if (opts.includeThinking && msg.thinking && msg.thinking.length > 0) {
        const thinkingTokens = msg.thinking.reduce((sum, t) => sum + t.thinking.length, 0);
        lines.push('<details>');
        lines.push(`<summary>Thinking (~${Math.round(thinkingTokens / 4)} tokens)</summary>`);
        lines.push('');
        for (const tb of msg.thinking) {
          lines.push(tb.thinking);
        }
        lines.push('');
        lines.push('</details>');
        lines.push('');
      }

      // Content blocks
      for (const block of msg.content) {
        if (block.type === 'text' && block.text) {
          lines.push(block.text);
          lines.push('');
        }
      }

      // Tool calls
      if (opts.includeToolCalls && msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          lines.push('<details>');
          lines.push(`<summary>Tool: ${tc.name}${tc.isError ? ' (ERROR)' : ''}</summary>`);
          lines.push('');
          lines.push('**Input:**');
          lines.push('```json');
          lines.push(JSON.stringify(tc.input, null, 2));
          lines.push('```');
          if (tc.result !== undefined) {
            lines.push('');
            lines.push('**Result:**');
            lines.push('```');
            lines.push(typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2));
            lines.push('```');
          }
          lines.push('');
          lines.push('</details>');
          lines.push('');
        }
      }

      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}

export default app;
