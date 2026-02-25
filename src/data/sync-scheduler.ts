import { runSync } from './sync';
import { invalidateCache } from './scanner';
import { SYNC_INTERVAL_MS } from '../shared/paths';

let syncTimer: ReturnType<typeof setInterval> | null = null;

export async function initSync(): Promise<void> {
  console.log('[sync] Running initial sync...');
  const status = await runSync();
  invalidateCache();
  console.log(
    `[sync] Complete: ${status.totalFiles} files, ${status.errors.length} errors, took ${status.lastSyncDurationMs}ms`,
  );
}

export function startPeriodicSync(intervalMs: number = SYNC_INTERVAL_MS): void {
  if (syncTimer) return;
  syncTimer = setInterval(async () => {
    try {
      const status = await runSync();
      invalidateCache();
      if (status.totalFiles > 0) {
        console.log(
          `[sync] Periodic sync: ${status.totalFiles} files, ${status.lastSyncDurationMs}ms`,
        );
      }
    } catch (err) {
      console.error('[sync] Periodic sync failed:', err);
    }
  }, intervalMs);
}

export function stopPeriodicSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

export function restartPeriodicSync(intervalMs: number): void {
  stopPeriodicSync();
  startPeriodicSync(intervalMs);
}
