import { SHORTCUTS } from '../hooks/useKeyboard';
import { XIcon } from './Icons';

interface KeyboardShortcutsProps {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(var(--blur-sm))',
        WebkitBackdropFilter: 'blur(var(--blur-sm))',
        animation: 'backdrop-enter var(--duration-base) ease forwards',
      }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 max-w-sm w-full mx-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xl)',
          animation: 'scaleIn var(--duration-enter) var(--ease-out-back) forwards',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <XIcon size={16} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="space-y-3">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{s.description}</span>
              <kbd
                className="inline-flex items-center justify-center text-xs font-mono rounded-lg min-w-[2rem] h-7 px-2"
                style={{
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 2px 0 var(--color-border), var(--shadow-sm)',
                  color: 'var(--color-text)',
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-5 w-full text-sm py-2.5 rounded-xl btn-ghost"
          style={{ border: '1px solid var(--color-border)' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
