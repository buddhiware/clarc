import { readdir, stat, copyFile, mkdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { SOURCE_DIR, DATA_DIR, SYNC_STATE_FILE } from '../shared/paths';
import type { SyncState, SyncedFile, SyncError, SyncStatus } from '../shared/types';

// Allowlist of what to sync from SOURCE_DIR
const SYNC_TARGETS = [
  { type: 'dir' as const, rel: 'projects' },
  { type: 'dir' as const, rel: 'todos' },
  { type: 'file' as const, rel: 'stats-cache.json' },
  { type: 'file' as const, rel: 'history.jsonl' },
];

// File extension filters per top-level directory
const DIR_FILTERS: Record<string, (filename: string) => boolean> = {
  projects: (f) => f.endsWith('.jsonl') || f.endsWith('.txt'),
  todos: (f) => f.endsWith('.json'),
};

// Module state
let syncState: SyncState | null = null;
let isSyncing = false;

function freshState(): SyncState {
  return {
    version: 1,
    lastSyncAt: '',
    lastSyncDurationMs: 0,
    syncCount: 0,
    sourceDir: SOURCE_DIR,
    fileInventory: {},
    errors: [],
  };
}

async function loadSyncState(): Promise<SyncState> {
  if (syncState) return syncState;
  try {
    const text = await readFile(SYNC_STATE_FILE, 'utf-8');
    syncState = JSON.parse(text) as SyncState;
    return syncState!;
  } catch {
    syncState = freshState();
    return syncState;
  }
}

async function saveSyncState(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SYNC_STATE_FILE, JSON.stringify(syncState, null, 2));
}

// ────────────────────────────────────────────
// Core sync logic
// ────────────────────────────────────────────

export async function runSync(): Promise<SyncStatus> {
  if (isSyncing) {
    return getSyncStatus();
  }

  isSyncing = true;
  const startTime = Date.now();
  const state = await loadSyncState();
  state.errors = [];

  try {
    await mkdir(DATA_DIR, { recursive: true });

    for (const target of SYNC_TARGETS) {
      const sourcePath = join(SOURCE_DIR, target.rel);
      const destPath = join(DATA_DIR, target.rel);

      if (target.type === 'file') {
        await syncSingleFile(sourcePath, destPath, target.rel, state);
      } else {
        await syncDirectory(sourcePath, destPath, target.rel, state);
      }
    }

    state.lastSyncAt = new Date().toISOString();
    state.lastSyncDurationMs = Date.now() - startTime;
    state.syncCount++;
    state.sourceDir = SOURCE_DIR;

    // Cap errors at 50
    if (state.errors.length > 50) {
      state.errors = state.errors.slice(-50);
    }

    await saveSyncState();
  } catch (err) {
    console.error('[sync] Fatal error during sync:', err);
  } finally {
    isSyncing = false;
  }

  return getSyncStatus();
}

async function syncSingleFile(
  sourcePath: string,
  destPath: string,
  relativePath: string,
  state: SyncState,
): Promise<void> {
  try {
    const srcStat = await stat(sourcePath);
    const existing = state.fileInventory[relativePath];

    if (
      existing &&
      existing.sourceMtimeMs === srcStat.mtimeMs &&
      existing.sourceSizeBytes === srcStat.size
    ) {
      return; // unchanged
    }

    await mkdir(dirname(destPath), { recursive: true });
    await copyFile(sourcePath, destPath);

    state.fileInventory[relativePath] = {
      relativePath,
      sourceMtimeMs: srcStat.mtimeMs,
      sourceSizeBytes: srcStat.size,
      syncedAt: new Date().toISOString(),
    };
  } catch (err) {
    // Source file may not exist — that's fine
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      state.errors.push({
        timestamp: new Date().toISOString(),
        relativePath,
        error: String(err),
      });
    }
  }
}

async function syncDirectory(
  sourcePath: string,
  destPath: string,
  baseRel: string,
  state: SyncState,
): Promise<void> {
  try {
    await walkAndSync(sourcePath, destPath, baseRel, state);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      state.errors.push({
        timestamp: new Date().toISOString(),
        relativePath: baseRel,
        error: String(err),
      });
    }
  }
}

async function walkAndSync(
  srcDir: string,
  destDir: string,
  relBase: string,
  state: SyncState,
): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(srcDir);
  } catch {
    return; // directory doesn't exist
  }

  const topLevel = relBase.split('/')[0];
  const filter = DIR_FILTERS[topLevel] || (() => true);

  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    const relPath = join(relBase, entry);

    try {
      const entryStat = await stat(srcPath);

      if (entryStat.isDirectory()) {
        await walkAndSync(srcPath, destPath, relPath, state);
      } else if (entryStat.isFile() && filter(entry)) {
        const existing = state.fileInventory[relPath];
        if (
          existing &&
          existing.sourceMtimeMs === entryStat.mtimeMs &&
          existing.sourceSizeBytes === entryStat.size
        ) {
          continue; // unchanged
        }

        await mkdir(dirname(destPath), { recursive: true });
        await copyFile(srcPath, destPath);

        state.fileInventory[relPath] = {
          relativePath: relPath,
          sourceMtimeMs: entryStat.mtimeMs,
          sourceSizeBytes: entryStat.size,
          syncedAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      state.errors.push({
        timestamp: new Date().toISOString(),
        relativePath: relPath,
        error: String(err),
      });
    }
  }
}

// ────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────

export function getSyncStatus(): SyncStatus {
  const state = syncState || freshState();
  const files = Object.values(state.fileInventory);
  return {
    lastSyncAt: state.lastSyncAt || null,
    lastSyncDurationMs: state.lastSyncDurationMs,
    syncCount: state.syncCount,
    sourceDir: state.sourceDir,
    totalFiles: files.length,
    totalSizeBytes: files.reduce((sum, f) => sum + f.sourceSizeBytes, 0),
    errors: state.errors,
    isSyncing,
  };
}

export async function needsInitialSync(): Promise<boolean> {
  try {
    await stat(SYNC_STATE_FILE);
    return false;
  } catch {
    return true;
  }
}
