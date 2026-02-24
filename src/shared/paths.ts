import { homedir } from 'os';
import { join } from 'path';

export const CLAUDE_DIR = process.env.CLARC_CLAUDE_DIR || join(homedir(), '.claude');
export const CONFIG_DIR = process.env.CLARC_CONFIG_DIR || join(homedir(), '.config', 'clarc');
export const PORT = parseInt(process.env.CLARC_PORT || '3838', 10);

// Derived paths
export const PROJECTS_DIR = join(CLAUDE_DIR, 'projects');
export const TODOS_DIR = join(CLAUDE_DIR, 'todos');
export const PLANS_DIR = join(CLAUDE_DIR, 'plans');
export const FILE_HISTORY_DIR = join(CLAUDE_DIR, 'file-history');
export const HISTORY_FILE = join(CLAUDE_DIR, 'history.jsonl');
export const STATS_FILE = join(CLAUDE_DIR, 'stats-cache.json');
export const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');
