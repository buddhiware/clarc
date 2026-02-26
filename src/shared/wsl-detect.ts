import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

/** Check if running inside WSL */
export function isWSL(): boolean {
  try {
    const version = readFileSync('/proc/version', 'utf-8');
    return version.toLowerCase().includes('microsoft');
  } catch {
    return false;
  }
}

/** Detect Windows-side .claude directories accessible from WSL */
export function detectWindowsClaudeDirs(): string[] {
  if (!isWSL()) return [];
  const found: string[] = [];

  // Scan common Windows drive mount points
  const mountPoints = ['/mnt/c', '/mnt/d'];

  for (const mount of mountPoints) {
    try {
      const usersDir = join(mount, 'Users');
      const users = readdirSync(usersDir);
      const skip = new Set(['Public', 'Default', 'Default User', 'All Users']);
      for (const user of users) {
        if (skip.has(user)) continue;
        const claudeDir = join(usersDir, user, '.claude');
        if (existsSync(join(claudeDir, 'projects'))) {
          found.push(claudeDir);
        }
      }
    } catch {
      // mount point may not be accessible
    }
  }

  return found;
}
