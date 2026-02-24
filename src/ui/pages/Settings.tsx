import { useSettings, ClarcSettings } from '../hooks/useSettings';
import { useApi } from '../hooks/useApi';
import { SunIcon, MoonIcon, MonitorIcon } from '../components/Icons';

interface RuntimeInfo {
  sourceDir: string;
  dataDir: string;
  syncIntervalMs: number;
  port: number;
  version: string;
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

const THEME_OPTIONS: { value: ClarcSettings['theme']; label: string; Icon: typeof SunIcon }[] = [
  { value: 'system', label: 'System', Icon: MonitorIcon },
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
];

export default function Settings() {
  const [settings, updateSettings] = useSettings();
  const { data: info } = useApi<RuntimeInfo>('/settings/info');

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gradient mb-2">Settings</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Configure your clarc experience. Settings are saved to your browser.
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
        <SettingRow label="Source directory" description="Where Claude Code stores session data (read-only).">
          <code
            className="text-xs px-2 py-1 rounded"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
          >
            {info?.sourceDir || '...'}
          </code>
        </SettingRow>

        <SettingRow label="Data directory" description="Where clarc stores its synced copy of session data.">
          <code
            className="text-xs px-2 py-1 rounded"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
          >
            {info?.dataDir || '...'}
          </code>
        </SettingRow>

        <SettingRow label="Sync interval" description="How often clarc checks for new session data.">
          <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
            {info ? `${Math.round(info.syncIntervalMs / 1000)}s` : '...'}
          </span>
        </SettingRow>

        <SettingRow label="Server port" description="The port clarc is running on.">
          <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
            {info?.port || '...'}
          </span>
        </SettingRow>
      </Section>

      {/* About */}
      <Section title="About">
        <SettingRow label="Version" description="Claude Archive">
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
        Settings are stored in your browser's localStorage.
      </div>
    </div>
  );
}
