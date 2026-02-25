#!/usr/bin/env bun
import { program } from './index';

// Support --port flag for Tauri sidecar mode
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
  program.parse();
} else {
  // Import server to start it
  await import('../server/index');
}
