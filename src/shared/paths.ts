import { homedir } from 'os';
import { join, dirname, basename } from 'path';

// Source directory (where Claude Code writes data — read-only)
export const SOURCE_DIR = process.env.CLARC_CLAUDE_DIR || join(homedir(), '.claude');

// clarc's own config directory
export const CONFIG_DIR = process.env.CLARC_CONFIG_DIR || join(homedir(), '.config', 'clarc');

// Port
export const PORT = parseInt(process.env.CLARC_PORT || '3838', 10);

// Sync interval (ms), default 5 minutes
export const SYNC_INTERVAL_MS = parseInt(process.env.CLARC_SYNC_INTERVAL_MS || '300000', 10);

// Portable data directory
// - Compiled binary: data/ next to the executable (portable)
// - Dev mode / bun run: CONFIG_DIR/data (unchanged behavior)
// - Explicit override: CLARC_DATA_DIR env var
export const DATA_DIR = process.env.CLARC_DATA_DIR || getDefaultDataDir();

function getDefaultDataDir(): string {
  const execName = basename(process.execPath);
  if (execName === 'clarc') {
    // Compiled binary — store data next to it for portability
    return join(dirname(process.execPath), 'data');
  }
  // Dev mode — use config directory
  return join(CONFIG_DIR, 'data');
}

// Derived paths — point to local data copy (populated by sync)
export const PROJECTS_DIR = join(DATA_DIR, 'projects');
export const TODOS_DIR = join(DATA_DIR, 'todos');
export const HISTORY_FILE = join(DATA_DIR, 'history.jsonl');
export const STATS_FILE = join(DATA_DIR, 'stats-cache.json');

// Sync state file — lives inside DATA_DIR so it travels with the data
export const SYNC_STATE_FILE = join(DATA_DIR, 'sync-state.json');

// Legacy alias — some existing code references CLAUDE_DIR
export const CLAUDE_DIR = SOURCE_DIR;

// These are NOT synced — always read from source
export const PLANS_DIR = join(SOURCE_DIR, 'plans');
export const FILE_HISTORY_DIR = join(SOURCE_DIR, 'file-history');
export const SETTINGS_FILE = join(SOURCE_DIR, 'settings.json');
