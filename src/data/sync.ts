import { readdir, stat, copyFile, mkdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { SOURCE_DIRS, DATA_DIR, SYNC_STATE_FILE } from '../shared/paths';
import type { SyncState, SyncedFile, SyncError, SyncStatus } from '../shared/types';

// Allowlist of what to sync from each source directory
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
    version: 2,
    lastSyncAt: '',
    lastSyncDurationMs: 0,
    syncCount: 0,
    sourceDirs: SOURCE_DIRS,
    fileInventory: {},
    errors: [],
  };
}

/** Migrate v1 sync state to v2 (prefix inventory keys with source index) */
function migrateV1toV2(v1: any): SyncState {
  const newInventory: Record<string, SyncedFile> = {};
  for (const [key, file] of Object.entries(v1.fileInventory || {})) {
    const f = file as any;
    newInventory[`0:${key}`] = { ...f, sourceIndex: 0 };
  }
  return {
    version: 2,
    lastSyncAt: v1.lastSyncAt || '',
    lastSyncDurationMs: v1.lastSyncDurationMs || 0,
    syncCount: v1.syncCount || 0,
    sourceDirs: v1.sourceDir ? [v1.sourceDir] : SOURCE_DIRS,
    fileInventory: newInventory,
    errors: v1.errors || [],
  };
}

async function loadSyncState(): Promise<SyncState> {
  if (syncState) return syncState;
  try {
    const text = await readFile(SYNC_STATE_FILE, 'utf-8');
    const loaded = JSON.parse(text);
    if (loaded.version === 1 || !loaded.version) {
      syncState = migrateV1toV2(loaded);
    } else {
      syncState = loaded as SyncState;
    }
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

    for (let sourceIndex = 0; sourceIndex < SOURCE_DIRS.length; sourceIndex++) {
      const sourceDir = SOURCE_DIRS[sourceIndex];

      for (const target of SYNC_TARGETS) {
        const sourcePath = join(sourceDir, target.rel);

        if (target.rel === 'history.jsonl') {
          // Copy each source's history to a per-source file for later merge
          const destPath = join(DATA_DIR, `history-${sourceIndex}.jsonl`);
          await syncSingleFile(sourcePath, destPath, `history-${sourceIndex}.jsonl`, state, sourceIndex);
        } else if (target.type === 'file') {
          // stats-cache.json: last-wins (later source overwrites earlier)
          const destPath = join(DATA_DIR, target.rel);
          await syncSingleFile(sourcePath, destPath, target.rel, state, sourceIndex);
        } else {
          // directories: flat merge into same DATA_DIR tree
          const destPath = join(DATA_DIR, target.rel);
          await syncDirectory(sourcePath, destPath, target.rel, state, sourceIndex);
        }
      }
    }

    // Merge per-source history files into a single history.jsonl
    await mergeHistoryFiles();

    state.lastSyncAt = new Date().toISOString();
    state.lastSyncDurationMs = Date.now() - startTime;
    state.syncCount++;
    state.sourceDirs = SOURCE_DIRS;

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
  sourceIndex: number,
): Promise<void> {
  const inventoryKey = `${sourceIndex}:${relativePath}`;
  try {
    const srcStat = await stat(sourcePath);
    const existing = state.fileInventory[inventoryKey];

    if (
      existing &&
      existing.sourceMtimeMs === srcStat.mtimeMs &&
      existing.sourceSizeBytes === srcStat.size
    ) {
      return; // unchanged
    }

    await mkdir(dirname(destPath), { recursive: true });
    await copyFile(sourcePath, destPath);

    state.fileInventory[inventoryKey] = {
      relativePath,
      sourceIndex,
      sourceMtimeMs: srcStat.mtimeMs,
      sourceSizeBytes: srcStat.size,
      syncedAt: new Date().toISOString(),
    };
  } catch (err) {
    // Source file may not exist — that's fine
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      state.errors.push({
        timestamp: new Date().toISOString(),
        relativePath: `[source ${sourceIndex}] ${relativePath}`,
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
  sourceIndex: number,
): Promise<void> {
  try {
    await walkAndSync(sourcePath, destPath, baseRel, state, sourceIndex);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      state.errors.push({
        timestamp: new Date().toISOString(),
        relativePath: `[source ${sourceIndex}] ${baseRel}`,
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
  sourceIndex: number,
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
    const inventoryKey = `${sourceIndex}:${relPath}`;

    try {
      const entryStat = await stat(srcPath);

      if (entryStat.isDirectory()) {
        await walkAndSync(srcPath, destPath, relPath, state, sourceIndex);
      } else if (entryStat.isFile() && filter(entry)) {
        const existing = state.fileInventory[inventoryKey];
        if (
          existing &&
          existing.sourceMtimeMs === entryStat.mtimeMs &&
          existing.sourceSizeBytes === entryStat.size
        ) {
          continue; // unchanged
        }

        await mkdir(dirname(destPath), { recursive: true });
        await copyFile(srcPath, destPath);

        state.fileInventory[inventoryKey] = {
          relativePath: relPath,
          sourceIndex,
          sourceMtimeMs: entryStat.mtimeMs,
          sourceSizeBytes: entryStat.size,
          syncedAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      state.errors.push({
        timestamp: new Date().toISOString(),
        relativePath: `[source ${sourceIndex}] ${relPath}`,
        error: String(err),
      });
    }
  }
}

/** Merge per-source history-N.jsonl files into a single history.jsonl */
async function mergeHistoryFiles(): Promise<void> {
  const seen = new Set<string>();
  const lines: string[] = [];

  for (let i = 0; i < SOURCE_DIRS.length; i++) {
    const perSourceFile = join(DATA_DIR, `history-${i}.jsonl`);
    try {
      const text = await readFile(perSourceFile, 'utf-8');
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          const key = `${obj.sessionId || ''}:${obj.timestamp || ''}`;
          if (!seen.has(key)) {
            seen.add(key);
            lines.push(line);
          }
        } catch {
          // skip malformed lines
        }
      }
    } catch {
      // per-source file may not exist
    }
  }

  // Sort by timestamp descending
  lines.sort((a, b) => {
    try {
      const ta = JSON.parse(a).timestamp || 0;
      const tb = JSON.parse(b).timestamp || 0;
      return tb - ta;
    } catch {
      return 0;
    }
  });

  const mergedPath = join(DATA_DIR, 'history.jsonl');
  await writeFile(mergedPath, lines.length > 0 ? lines.join('\n') + '\n' : '');
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
    sourceDir: state.sourceDirs[0] || '',
    sourceDirs: state.sourceDirs,
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
