import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts(
  setShowHelp: (v: boolean) => void,
  closePanel?: () => void,
) {
  const navigate = useNavigate();

  const handler = useCallback((e: KeyboardEvent) => {
    // Don't capture when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case '/':
        e.preventDefault();
        navigate('/search');
        setTimeout(() => {
          const input = document.querySelector('input[type="text"]') as HTMLInputElement;
          input?.focus();
        }, 100);
        break;
      case '?':
        e.preventDefault();
        setShowHelp(true);
        break;
      case 'Escape':
        // Close panel first, then help overlay
        if (closePanel) closePanel();
        setShowHelp(false);
        break;
    }
  }, [navigate, setShowHelp, closePanel]);

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}

export const SHORTCUTS = [
  { key: '/', description: 'Focus search' },
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'Esc', description: 'Close overlay / go back' },
  { key: '[', description: 'Previous session (in session view)' },
  { key: ']', description: 'Next session (in session view)' },
];
