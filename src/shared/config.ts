import { homedir } from 'os';
import { join, dirname, basename } from 'path';
import { readFileSync, existsSync } from 'fs';
import { readFile, writeFile, mkdir, unlink, readdir } from 'fs/promises';

export interface ClarcConfig {
  sourceDir?: string;       // Single source (backward compat)
  sourceDirs?: string[];    // Multiple source directories
  dataDir?: string;
  port?: number;
  syncIntervalMs?: number;
  projectGroups?: Record<string, string[]>;  // displayName → [projectId, ...]
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

/** Resolve the path to clarc.json — portable logic matches DATA_DIR in paths.ts */
export function getConfigFilePath(): string {
  // Tauri sidecar — config in platform app data directory
  if (process.env.CLARC_APP_DATA) {
    return join(process.env.CLARC_APP_DATA, 'clarc.json');
  }
  const execName = basename(process.execPath);
  if (execName === 'clarc' || execName.startsWith('clarc-core')) {
    // Compiled binary — config next to binary
    return join(dirname(process.execPath), 'clarc.json');
  }
  // Dev mode / Docker — use config dir
  const configDir = process.env.CLARC_CONFIG_DIR || join(homedir(), '.config', 'clarc');
  return join(configDir, 'clarc.json');
}

/** Pick only known fields from a parsed object */
function pickKnownFields(parsed: any): ClarcConfig {
  const config: ClarcConfig = {};
  if (typeof parsed.sourceDir === 'string') config.sourceDir = parsed.sourceDir;
  if (Array.isArray(parsed.sourceDirs)) {
    const dirs = parsed.sourceDirs.filter((s: any) => typeof s === 'string' && s.trim());
    if (dirs.length > 0) config.sourceDirs = dirs;
  }
  if (typeof parsed.dataDir === 'string') config.dataDir = parsed.dataDir;
  if (typeof parsed.port === 'number') config.port = parsed.port;
  if (typeof parsed.syncIntervalMs === 'number') config.syncIntervalMs = parsed.syncIntervalMs;
  if (parsed.projectGroups && typeof parsed.projectGroups === 'object' && !Array.isArray(parsed.projectGroups)) {
    const groups: Record<string, string[]> = {};
    for (const [name, ids] of Object.entries(parsed.projectGroups)) {
      if (Array.isArray(ids)) {
        const valid = (ids as any[]).filter((s: any) => typeof s === 'string' && s.trim());
        if (valid.length > 0) groups[name] = valid;
      }
    }
    if (Object.keys(groups).length > 0) config.projectGroups = groups;
  }
  return config;
}

/** Synchronous read — used at module load time by paths.ts. Returns {} if missing or corrupt. */
export function readConfigSync(): ClarcConfig {
  const configPath = getConfigFilePath();
  if (!existsSync(configPath)) return {};
  try {
    const text = readFileSync(configPath, 'utf-8');
    return pickKnownFields(JSON.parse(text));
  } catch (err) {
    console.warn('[config] Failed to parse clarc.json:', err);
    return {};
  }
}

/** Async read — used by API endpoints */
export async function readConfig(): Promise<ClarcConfig> {
  const configPath = getConfigFilePath();
  try {
    const text = await readFile(configPath, 'utf-8');
    return pickKnownFields(JSON.parse(text));
  } catch {
    return {};
  }
}

/** Validate a config object */
export async function validateConfig(config: ClarcConfig): Promise<ConfigValidationResult> {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // sourceDirs: validate each path has a projects/ subdirectory
  if (config.sourceDirs !== undefined && config.sourceDirs.length > 0) {
    for (let i = 0; i < config.sourceDirs.length; i++) {
      const dir = config.sourceDirs[i];
      const key = `sourceDirs[${i}]`;
      try {
        const projectsPath = join(dir, 'projects');
        const entries = await readdir(projectsPath);
        if (entries.length === 0) {
          warnings[key] = 'projects/ directory exists but is empty — no session data found yet';
        }
      } catch {
        errors[key] = 'Not a valid Claude Code profile directory (missing projects/ subdirectory)';
      }
    }
  }

  // sourceDir (legacy): same validation for backward compat
  if (config.sourceDir !== undefined && !config.sourceDirs) {
    try {
      const projectsPath = join(config.sourceDir, 'projects');
      const entries = await readdir(projectsPath);
      if (entries.length === 0) {
        warnings.sourceDir = 'projects/ directory exists but is empty — no session data found yet';
      }
    } catch {
      errors.sourceDir = 'Not a valid Claude Code profile directory (missing projects/ subdirectory)';
    }
  }

  // dataDir: must be writable
  if (config.dataDir !== undefined) {
    try {
      await mkdir(config.dataDir, { recursive: true });
      const testFile = join(config.dataDir, '.clarc-write-test');
      await writeFile(testFile, '');
      await unlink(testFile);
    } catch {
      errors.dataDir = 'Directory is not writable';
    }
  }

  // port: valid number 1-65535
  if (config.port !== undefined) {
    if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
      errors.port = 'Must be an integer between 1 and 65535';
    }
  }

  // syncIntervalMs: minimum 10000 (10 seconds)
  if (config.syncIntervalMs !== undefined) {
    if (!Number.isInteger(config.syncIntervalMs) || config.syncIntervalMs < 10000) {
      errors.syncIntervalMs = 'Must be at least 10 seconds';
    }
  }

  // projectGroups: validate group names and member IDs
  if (config.projectGroups) {
    const allMembers = new Set<string>();
    for (const [name, memberIds] of Object.entries(config.projectGroups)) {
      const key = `projectGroups.${name}`;
      if (!name.trim()) {
        errors[key] = 'Group name cannot be empty';
        continue;
      }
      if (memberIds.length === 0) {
        errors[key] = 'Group must have at least one project';
        continue;
      }
      // Warn about overlapping membership
      for (const id of memberIds) {
        if (allMembers.has(id)) {
          warnings[key] = `Project "${id}" appears in multiple groups — first group wins`;
        }
        allMembers.add(id);
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors, warnings };
}

/** Write config to disk (creates parent directory if needed) */
export async function writeConfig(config: ClarcConfig): Promise<void> {
  const configPath = getConfigFilePath();
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
}
