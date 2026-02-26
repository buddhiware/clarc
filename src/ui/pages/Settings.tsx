import { useState, useEffect } from 'react';
import { useSettings, ClarcSettings, toggleProjectArchived } from '../hooks/useSettings';
import { useApi } from '../hooks/useApi';
import { SunIcon, MoonIcon, MonitorIcon, ArchiveIcon, FolderIcon, PlusIcon, XIcon } from '../components/Icons';

interface RuntimeInfo {
  sourceDir: string;
  sourceDirs: string[];
  dataDir: string;
  syncIntervalMs: number;
  port: number;
  version: string;
  configFilePath: string;
  configFile: {
    sourceDir?: string;
    sourceDirs?: string[];
    dataDir?: string;
    port?: number;
    syncIntervalMs?: number;
  };
  envOverrides: {
    sourceDir: boolean;
    dataDir: boolean;
    port: boolean;
    syncIntervalMs: boolean;
  };
}

interface DetectSourcesResult {
  detected: string[];
  suggestions: string[];
  isWSL: boolean;
}

interface ProjectSummary {
  id: string;
  name: string;
  sessionCount: number;
  lastActiveAt: string;
  messageCount: number;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2
        className="text-lg font-semibold mb-4 pb-2"
        style={{ color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}
      >
        {title}
      </h2>
      <div className="space-y-5">
        {children}
      </div>
    </section>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</div>
        {description && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  );
}

function EnvBadge() {
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{ backgroundColor: 'var(--color-accent-amber)', color: '#000', opacity: 0.85 }}
    >
      env
    </span>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--color-surface-2)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
};

const INPUT_ERROR_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  borderColor: 'var(--color-accent-rose)',
};

const THEME_OPTIONS: { value: ClarcSettings['theme']; label: string; Icon: typeof SunIcon }[] = [
  { value: 'system', label: 'System', Icon: MonitorIcon },
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
];

export default function Settings() {
  const [settings, updateSettings] = useSettings();
  const { data: info, refetch: refetchInfo } = useApi<RuntimeInfo>('/settings/info');
  const { data: projects } = useApi<ProjectSummary[]>('/projects');

  const archivedProjects = (projects || []).filter(p =>
    settings.archivedProjects.includes(p.id)
  );

  // Editable config state
  const [editSourceDirs, setEditSourceDirs] = useState<string[]>(['']);
  const [editDataDir, setEditDataDir] = useState('');
  const [editPort, setEditPort] = useState('');
  const [editSyncSec, setEditSyncSec] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    saved: boolean;
    restartRequired?: boolean;
    errors?: Record<string, string>;
    warnings?: Record<string, string>;
  } | null>(null);
  const [detectedSources, setDetectedSources] = useState<DetectSourcesResult | null>(null);
  const [detecting, setDetecting] = useState(false);

  // Initialize edit fields from server config file contents
  useEffect(() => {
    if (info) {
      const dirs = info.configFile.sourceDirs
        || (info.configFile.sourceDir ? [info.configFile.sourceDir] : []);
      setEditSourceDirs(dirs.length > 0 ? dirs : ['']);
      setEditDataDir(info.configFile.dataDir || '');
      setEditPort(info.configFile.port?.toString() || '');
      setEditSyncSec(info.configFile.syncIntervalMs ? String(info.configFile.syncIntervalMs / 1000) : '');
    }
  }, [info]);

  // Compute initial source dirs for change detection
  const initialSourceDirs = info
    ? (info.configFile.sourceDirs || (info.configFile.sourceDir ? [info.configFile.sourceDir] : []))
    : [];

  // Detect unsaved changes
  const currentDirs = editSourceDirs.filter(d => d.trim());
  const hasChanges = info ? (
    JSON.stringify(currentDirs) !== JSON.stringify(initialSourceDirs) ||
    editDataDir !== (info.configFile.dataDir || '') ||
    editPort !== (info.configFile.port?.toString() || '') ||
    editSyncSec !== (info.configFile.syncIntervalMs ? String(info.configFile.syncIntervalMs / 1000) : '')
  ) : false;

  function updateSourceDir(index: number, value: string) {
    const next = [...editSourceDirs];
    next[index] = value;
    setEditSourceDirs(next);
    setSaveResult(null);
  }

  function removeSourceDir(index: number) {
    const next = editSourceDirs.filter((_, i) => i !== index);
    setEditSourceDirs(next.length > 0 ? next : ['']);
    setSaveResult(null);
  }

  function addSourceDir(value = '') {
    setEditSourceDirs([...editSourceDirs, value]);
    setSaveResult(null);
  }

  async function handleDetectSources() {
    setDetecting(true);
    try {
      const res = await fetch('/api/settings/detect-sources');
      const result: DetectSourcesResult = await res.json();
      setDetectedSources(result);
    } catch {
      // detection failed silently
    } finally {
      setDetecting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveResult(null);
    try {
      const body: Record<string, any> = {};
      const dirs = editSourceDirs.map(d => d.trim()).filter(Boolean);
      body.sourceDirs = dirs.length > 0 ? dirs : null;
      body.sourceDir = null; // clear legacy field
      body.dataDir = editDataDir.trim() || null;
      body.port = editPort.trim() ? parseInt(editPort, 10) : null;
      body.syncIntervalMs = editSyncSec.trim() ? Math.round(parseFloat(editSyncSec) * 1000) : null;

      const res = await fetch('/api/settings/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      setSaveResult(result);
      if (result.saved) {
        await refetchInfo();
      }
    } catch {
      setSaveResult({ saved: false, errors: { _general: 'Failed to save config' } });
    } finally {
      setSaving(false);
    }
  }

  // Filter detected suggestions to exclude already-added dirs
  const suggestions = detectedSources?.suggestions.filter(
    s => !editSourceDirs.some(d => d.trim() === s)
  ) || [];

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gradient mb-2">Settings</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Configure your clarc experience. Display settings are saved to your browser. Data settings are saved to clarc.json.
        </p>
      </div>

      {/* Display */}
      <Section title="Display">
        <SettingRow label="Theme" description="Choose light, dark, or match your system preference.">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            {THEME_OPTIONS.map(({ value, label, Icon }) => {
              const active = settings.theme === value;
              return (
                <button
                  key={value}
                  onClick={() => updateSettings({ theme: value })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer"
                  style={{
                    backgroundColor: active ? 'var(--color-primary-subtle)' : 'transparent',
                    color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    borderRight: value !== 'dark' ? '1px solid var(--color-border)' : 'none',
                    transition: 'all var(--duration-fast) ease',
                  }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
          </div>
        </SettingRow>

        <SettingRow
          label="Auto-collapse threshold"
          description={`Long messages collapse after ${settings.collapseThreshold}px. Set to 0 to disable.`}
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1000}
              step={50}
              value={settings.collapseThreshold}
              onChange={e => updateSettings({ collapseThreshold: parseInt(e.target.value, 10) })}
              className="w-32"
              style={{ accentColor: 'var(--color-primary)' }}
            />
            <span
              className="text-xs font-mono w-12 text-right"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {settings.collapseThreshold === 0 ? 'Off' : `${settings.collapseThreshold}px`}
            </span>
          </div>
        </SettingRow>

        <SettingRow
          label="Show thinking by default"
          description="Whether thinking blocks are expanded when you open a session."
        >
          <button
            onClick={() => updateSettings({ defaultShowThinking: !settings.defaultShowThinking })}
            className="relative w-10 h-5 rounded-full cursor-pointer"
            style={{
              backgroundColor: settings.defaultShowThinking ? 'var(--color-primary)' : 'var(--color-surface-3)',
              transition: 'background-color var(--duration-fast) ease',
            }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full"
              style={{
                backgroundColor: '#fff',
                left: settings.defaultShowThinking ? '22px' : '2px',
                transition: 'left var(--duration-fast) ease',
                boxShadow: 'var(--shadow-sm)',
              }}
            />
          </button>
        </SettingRow>
      </Section>

      {/* Data */}
      <Section title="Data">
        <SettingRow label="Config file" description="Location of clarc.json on the server.">
          <code
            className="text-xs px-2 py-1 rounded"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
          >
            {info?.configFilePath || '...'}
          </code>
        </SettingRow>

        {/* Source directories */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Source directories</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Where Claude Code stores session data. Add multiple to merge sources.
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {info?.envOverrides.sourceDir ? (
              <>
                <div className="flex items-center gap-2">
                  <EnvBadge />
                </div>
                {info.sourceDirs.map((dir, i) => (
                  <code
                    key={i}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
                  >
                    {dir}
                  </code>
                ))}
              </>
            ) : (
              <>
                {editSourceDirs.map((dir, i) => {
                  const errorKey = `sourceDirs[${i}]`;
                  const warningKey = `sourceDirs[${i}]`;
                  return (
                    <div key={i} className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={dir}
                          onChange={e => updateSourceDir(i, e.target.value)}
                          placeholder={i === 0 ? (info?.sourceDir || '~/.claude') : '/path/to/.claude'}
                          className="text-xs px-2 py-1.5 rounded w-64 font-mono outline-none"
                          style={saveResult?.errors?.[errorKey] ? INPUT_ERROR_STYLE : INPUT_STYLE}
                        />
                        {editSourceDirs.length > 1 && (
                          <button
                            onClick={() => removeSourceDir(i)}
                            className="btn-ghost p-1 rounded"
                            title="Remove source"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            <XIcon size={12} />
                          </button>
                        )}
                      </div>
                      {saveResult?.errors?.[errorKey] && (
                        <span className="text-[11px]" style={{ color: 'var(--color-accent-rose)' }}>
                          {saveResult.errors[errorKey]}
                        </span>
                      )}
                      {saveResult?.warnings?.[warningKey] && (
                        <span className="text-[11px]" style={{ color: 'var(--color-accent-amber)' }}>
                          {saveResult.warnings[warningKey]}
                        </span>
                      )}
                    </div>
                  );
                })}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addSourceDir()}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded btn-ghost"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <PlusIcon size={11} />
                    Add source
                  </button>
                  <button
                    onClick={handleDetectSources}
                    disabled={detecting}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded btn-ghost"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {detecting ? 'Detecting...' : 'Auto-detect'}
                  </button>
                </div>
                {suggestions.length > 0 && (
                  <div className="flex flex-col items-end gap-1 mt-1">
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      Detected:
                    </span>
                    {suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => addSourceDir(s)}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                          color: 'var(--color-primary)',
                          border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
                        }}
                      >
                        <PlusIcon size={10} />
                        <code className="font-mono">{s}</code>
                      </button>
                    ))}
                  </div>
                )}
                {detectedSources && suggestions.length === 0 && !detecting && (
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {detectedSources.isWSL
                      ? 'No additional sources found on Windows side.'
                      : 'Auto-detect is only available on WSL.'}
                  </span>
                )}
              </>
            )}
            {/* Legacy sourceDir errors (shouldn't appear normally) */}
            {saveResult?.errors?.sourceDir && (
              <span className="text-[11px]" style={{ color: 'var(--color-accent-rose)' }}>
                {saveResult.errors.sourceDir}
              </span>
            )}
          </div>
        </div>

        {/* Data directory */}
        <SettingRow label="Data directory" description="Where clarc stores its synced copy of session data.">
          <div className="flex flex-col items-end gap-1">
            {info?.envOverrides.dataDir ? (
              <div className="flex items-center gap-2">
                <EnvBadge />
                <code className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                  {info.dataDir}
                </code>
              </div>
            ) : (
              <input
                type="text"
                value={editDataDir}
                onChange={e => { setEditDataDir(e.target.value); setSaveResult(null); }}
                placeholder={info?.dataDir || '~/.config/clarc/data'}
                className="text-xs px-2 py-1.5 rounded w-64 font-mono outline-none"
                style={saveResult?.errors?.dataDir ? INPUT_ERROR_STYLE : INPUT_STYLE}
              />
            )}
            {saveResult?.errors?.dataDir && (
              <span className="text-[11px]" style={{ color: 'var(--color-accent-rose)' }}>
                {saveResult.errors.dataDir}
              </span>
            )}
          </div>
        </SettingRow>

        {/* Server port */}
        <SettingRow label="Server port" description="The port clarc listens on. Requires restart.">
          <div className="flex flex-col items-end gap-1">
            {info?.envOverrides.port ? (
              <div className="flex items-center gap-2">
                <EnvBadge />
                <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{info.port}</span>
              </div>
            ) : (
              <input
                type="number"
                value={editPort}
                onChange={e => { setEditPort(e.target.value); setSaveResult(null); }}
                placeholder={String(info?.port || 3838)}
                min={1}
                max={65535}
                className="text-xs px-2 py-1.5 rounded w-24 font-mono outline-none"
                style={saveResult?.errors?.port ? INPUT_ERROR_STYLE : INPUT_STYLE}
              />
            )}
            {saveResult?.errors?.port && (
              <span className="text-[11px]" style={{ color: 'var(--color-accent-rose)' }}>
                {saveResult.errors.port}
              </span>
            )}
          </div>
        </SettingRow>

        {/* Sync interval */}
        <SettingRow label="Sync interval" description="How often clarc checks for new session data (in seconds).">
          <div className="flex flex-col items-end gap-1">
            {info?.envOverrides.syncIntervalMs ? (
              <div className="flex items-center gap-2">
                <EnvBadge />
                <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                  {Math.round(info.syncIntervalMs / 1000)}s
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={editSyncSec}
                  onChange={e => { setEditSyncSec(e.target.value); setSaveResult(null); }}
                  placeholder={info ? String(Math.round(info.syncIntervalMs / 1000)) : '300'}
                  min={10}
                  className="text-xs px-2 py-1.5 rounded w-24 font-mono outline-none"
                  style={saveResult?.errors?.syncIntervalMs ? INPUT_ERROR_STYLE : INPUT_STYLE}
                />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>sec</span>
              </div>
            )}
            {saveResult?.errors?.syncIntervalMs && (
              <span className="text-[11px]" style={{ color: 'var(--color-accent-rose)' }}>
                {saveResult.errors.syncIntervalMs}
              </span>
            )}
          </div>
        </SettingRow>

        {/* Save button */}
        {hasChanges && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs font-medium px-4 py-1.5 rounded-lg cursor-pointer"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                opacity: saving ? 0.6 : 1,
                transition: 'opacity var(--duration-fast) ease',
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        {/* Feedback banners */}
        {saveResult?.saved && saveResult.restartRequired && (
          <div
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent-amber) 12%, transparent)',
              color: 'var(--color-accent-amber)',
              border: '1px solid color-mix(in srgb, var(--color-accent-amber) 30%, transparent)',
            }}
          >
            Configuration saved to clarc.json. Restart clarc for source directory, data directory, and port changes to take effect.
          </div>
        )}

        {saveResult?.saved && !saveResult.restartRequired && (
          <div
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent-emerald) 12%, transparent)',
              color: 'var(--color-accent-emerald)',
              border: '1px solid color-mix(in srgb, var(--color-accent-emerald) 30%, transparent)',
            }}
          >
            Configuration saved and applied.
          </div>
        )}

        {saveResult && !saveResult.saved && saveResult.errors?._general && (
          <div
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent-rose) 12%, transparent)',
              color: 'var(--color-accent-rose)',
              border: '1px solid color-mix(in srgb, var(--color-accent-rose) 30%, transparent)',
            }}
          >
            {saveResult.errors._general}
          </div>
        )}
      </Section>

      {/* Archived Projects */}
      <Section title="Archived Projects">
        {archivedProjects.length === 0 ? (
          <div className="text-sm py-2" style={{ color: 'var(--color-text-muted)' }}>
            No archived projects. Archive a project from the sidebar by hovering and clicking the archive icon.
          </div>
        ) : (
          <div className="space-y-2">
            {archivedProjects.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
                    <FolderIcon size={14} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                      {p.name}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {p.sessionCount} sessions &middot; {p.messageCount} msgs
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleProjectArchived(settings, updateSettings, p.id)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer flex-shrink-0"
                  style={{
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-primary)',
                    transition: 'all var(--duration-fast) ease',
                  }}
                >
                  <ArchiveIcon size={12} />
                  Unarchive
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* About */}
      <Section title="About">
        <SettingRow label="Version" description="Inspired by the idea of a Claude archive — a local Claude Code history browser">
          <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
            {info?.version || '...'}
          </span>
        </SettingRow>

        <SettingRow label="Help & Guide" description="Learn about all clarc features.">
          <a
            href="/help"
            className="text-xs font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            Open Help
          </a>
        </SettingRow>
      </Section>

      <div className="mt-8 pt-6 text-center text-xs" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
        Display settings stored in localStorage. Data settings stored in clarc.json.
      </div>
    </div>
  );
}
