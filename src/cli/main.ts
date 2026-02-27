#!/usr/bin/env bun

// Support --port flag for Tauri sidecar mode
// MUST run before any imports that trigger paths.ts evaluation,
// because paths.ts reads CLARC_PORT at module init time.
const portArgIdx = process.argv.indexOf('--port');
if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
  process.env.CLARC_PORT = process.argv[portArgIdx + 1];
  // Remove --port and its value so Commander doesn't choke
  process.argv.splice(portArgIdx, 2);
}

// If no CLI args (or just 'serve'), start the server
const args = process.argv.slice(2);
const cliCommands = ['status', 'projects', 'search', 'export'];
const isCliCommand = args.length > 0 && cliCommands.some(cmd => args[0] === cmd);

if (isCliCommand) {
  // Dynamic import so paths.ts evaluates after env vars are set
  const { program } = await import('./index');
  program.parse();
} else {
  // Import server to start it
  await import('../server/index');
}
