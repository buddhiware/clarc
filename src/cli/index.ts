import { Command } from 'commander';
import { getIndex, reindex } from '../data/scanner';
import { parseSession, pairToolCalls } from '../data/parser';
import { readStatsCache, computeAnalytics } from '../data/stats';
import { PORT } from '../shared/paths';
import { initSync } from '../data/sync-scheduler';

const program = new Command();

program
  .name('clarc')
  .description('Claude Archive — browse, search, and analyze your Claude Code history')
  .version('0.2.0');

// Sync data before any command that reads it
program.hook('preAction', async (thisCommand) => {
  // Skip sync for the serve command (server handles its own sync)
  if (thisCommand.name() === 'serve') return;
  await initSync();
});

// Default command: start the web server
program
  .command('serve', { isDefault: true })
  .description('Start the web UI server')
  .option('-p, --port <port>', 'Port to listen on', String(PORT))
  .option('--no-open', 'Don\'t open the browser')
  .action(async (opts) => {
    // Server is started by the default export in server/index.ts
    console.log(`clarc is running at http://localhost:${opts.port}`);
  });

// Status
program
  .command('status')
  .description('Show stats about your Claude Code history')
  .action(async () => {
    const index = await getIndex();
    const stats = index.globalStats;

    console.log('clarc — Claude Archive Status');
    console.log('─'.repeat(40));
    console.log(`Projects:       ${index.projects.length}`);
    console.log(`Sessions:       ${index.projects.reduce((s, p) => s + p.sessions.length, 0)}`);
    console.log(`Messages:       ${index.projects.reduce((s, p) => s + p.messageCount, 0)}`);
    console.log(`Sub-agents:     ${index.projects.reduce((s, p) => s + p.agents.length, 0)}`);
    console.log(`Prompt history: ${index.promptHistory.length}`);

    if (stats) {
      console.log(`First session:  ${stats.firstSessionDate}`);
      console.log(`Total sessions: ${stats.totalSessions} (from stats-cache)`);
    }
  });

// Projects
program
  .command('projects')
  .description('List all projects')
  .action(async () => {
    const index = await getIndex();
    for (const p of index.projects) {
      const sessions = p.sessions.length;
      if (sessions === 0) continue;
      console.log(`${p.name.padEnd(30)} ${String(sessions).padStart(3)} sessions  ${String(p.messageCount).padStart(5)} msgs`);
    }
  });

// Search
program
  .command('search <query>')
  .description('Search across all sessions')
  .option('--json', 'Output as JSON')
  .option('-l, --limit <n>', 'Max results', '20')
  .action(async (query, opts) => {
    const index = await getIndex();
    const results: any[] = [];
    const queryLower = query.toLowerCase();
    const limit = parseInt(opts.limit);

    for (const project of index.projects) {
      for (const ref of project.sessions) {
        if (results.length >= limit) break;
        try {
          const session = await parseSession(ref.filePath, ref.id, ref.projectId);
          for (const msg of session.messages) {
            if (results.length >= limit) break;
            for (const block of msg.content) {
              if (block.text?.toLowerCase().includes(queryLower)) {
                const idx = block.text.toLowerCase().indexOf(queryLower);
                const start = Math.max(0, idx - 40);
                const end = Math.min(block.text.length, idx + query.length + 40);
                results.push({
                  project: project.name,
                  session: ref.id.slice(0, 8),
                  type: msg.type,
                  snippet: block.text.slice(start, end),
                });
                break;
              }
            }
          }
        } catch {}
      }
    }

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      for (const r of results) {
        console.log(`[${r.project}/${r.session}] (${r.type}) ...${r.snippet}...`);
      }
      console.log(`\n${results.length} results`);
    }
  });

// Export
program
  .command('export [sessionId]')
  .description('Export a session as markdown')
  .option('-o, --output <file>', 'Output file path')
  .option('--project <name>', 'Export all sessions in a project')
  .action(async (sessionId, opts) => {
    const index = await getIndex();

    if (sessionId) {
      for (const project of index.projects) {
        const ref = project.sessions.find(s => s.id === sessionId || s.id.startsWith(sessionId));
        if (ref) {
          const session = await parseSession(ref.filePath, ref.id, ref.projectId);
          pairToolCalls(session.messages);
          // Simple markdown output
          const lines = [`# Session: ${session.metadata.slug || ref.id.slice(0, 8)}`, ''];
          for (const msg of session.messages) {
            if (msg.role === 'user') {
              lines.push(`## User`);
              for (const b of msg.content) {
                if (b.text) lines.push(b.text);
              }
              lines.push('');
            } else if (msg.role === 'assistant') {
              lines.push(`## Assistant`);
              for (const b of msg.content) {
                if (b.text) lines.push(b.text);
              }
              lines.push('');
            }
          }
          const md = lines.join('\n');
          if (opts.output) {
            await Bun.write(opts.output, md);
            console.log(`Exported to ${opts.output}`);
          } else {
            console.log(md);
          }
          return;
        }
      }
      console.error(`Session not found: ${sessionId}`);
    } else {
      console.error('Usage: clarc export <session-id>');
    }
  });

export { program };
