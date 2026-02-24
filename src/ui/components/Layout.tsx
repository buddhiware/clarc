import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import KeyboardShortcuts from './KeyboardShortcuts';
import { useKeyboardShortcuts } from '../hooks/useKeyboard';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  useKeyboardShortcuts(setShowHelp);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <aside
          className="flex-shrink-0 overflow-y-auto border-r"
          style={{
            width: 280,
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <Sidebar onToggle={() => setSidebarOpen(false)} />
        </aside>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-3 left-3 z-50 p-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
            title="Show sidebar"
          >
            &raquo;
          </button>
        )}
        <Outlet />
      </main>

      {/* Keyboard shortcuts overlay */}
      <KeyboardShortcuts open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
