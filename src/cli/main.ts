#!/usr/bin/env bun
import { program } from './index';

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
