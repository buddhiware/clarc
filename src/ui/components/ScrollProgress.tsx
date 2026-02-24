import { useState, useEffect } from 'react';

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = document.querySelector('main');
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;
      setProgress(maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  if (progress <= 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-[3px]"
      style={{ backgroundColor: 'transparent' }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'var(--gradient-primary)',
          transition: 'width 50ms linear',
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  );
}
