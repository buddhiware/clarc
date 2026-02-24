import { SHORTCUTS } from '../hooks/useKeyboard';

interface KeyboardShortcutsProps {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-6 shadow-xl max-w-sm w-full"
        style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">Keyboard Shortcuts</h2>
        <div className="space-y-2">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{s.description}</span>
              <kbd className="text-xs px-2 py-1 rounded border font-mono"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full text-sm py-2 rounded-lg border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          Close (Esc)
        </button>
      </div>
    </div>
  );
}
