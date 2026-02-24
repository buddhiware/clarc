import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import KeyboardShortcuts from './KeyboardShortcuts';
import PageTransition from './PageTransition';
import ContextPanel from './ContextPanel';
import { ContextPanelProvider, useContextPanel } from './ContextPanelProvider';
import { useKeyboardShortcuts } from '../hooks/useKeyboard';
import { SidebarIcon } from './Icons';

export default function Layout() {
  return (
    <ContextPanelProvider>
      <LayoutInner />
    </ContextPanelProvider>
  );
}

function LayoutInner() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const { isOpen: panelOpen, panelWidth, closePanel } = useContextPanel();

  useKeyboardShortcuts(setShowHelp, closePanel);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Sidebar — always rendered, animated via CSS transform */}
      <aside
        className="flex-shrink-0 overflow-y-auto"
        style={{
          width: sidebarOpen ? 280 : 0,
          borderRight: sidebarOpen ? '1px solid var(--color-border)' : 'none',
          backgroundColor: 'var(--color-surface)',
          boxShadow: sidebarOpen ? 'var(--shadow-md)' : 'none',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform var(--duration-slow) var(--ease-out-expo), width var(--duration-slow) var(--ease-out-expo), box-shadow var(--duration-slow)',
          overflow: sidebarOpen ? undefined : 'hidden',
        }}
      >
        <Sidebar onToggle={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{
          marginRight: panelOpen ? panelWidth : 0,
          transition: 'margin-right var(--duration-slow) var(--ease-out-expo)',
        }}
      >
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-3 left-3 z-50 p-2 rounded-lg btn-ghost"
            title="Show sidebar"
          >
            <SidebarIcon size={16} />
          </button>
        )}
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      {/* Context panel (side panel for tool details, session previews, etc.) */}
      <ContextPanel />

      {/* Keyboard shortcuts overlay */}
      <KeyboardShortcuts open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
