import { useState, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from './Icons';

export default function ScrollNav() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = document.querySelector('main');
    if (!container) return;

    const handleScroll = () => {
      setVisible(container.scrollTop > window.innerHeight * 0.5);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (position: 'top' | 'bottom') => {
    const container = document.querySelector('main');
    if (!container) return;
    container.scrollTo({
      top: position === 'top' ? 0 : container.scrollHeight,
      behavior: 'smooth',
    });
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-40 flex items-center gap-1 rounded-full px-1 py-1"
      style={{
        backgroundColor: 'var(--color-surface-elevated)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-lg)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity var(--duration-base) ease, transform var(--duration-base) ease',
      }}
    >
      <button
        onClick={() => scrollTo('top')}
        className="btn-ghost p-2 rounded-full"
        title="Scroll to top"
      >
        <ChevronUpIcon size={14} />
      </button>
      <button
        onClick={() => scrollTo('bottom')}
        className="btn-ghost p-2 rounded-full"
        title="Scroll to bottom"
      >
        <ChevronDownIcon size={14} />
      </button>
    </div>
  );
}
