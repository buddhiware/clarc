import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from './Icons';

interface CollapsibleContentProps {
  maxCollapsedHeight?: number;
  gradientColor?: string;
  children: React.ReactNode;
}

export default function CollapsibleContent({
  maxCollapsedHeight = 300,
  gradientColor = 'var(--color-surface)',
  children,
}: CollapsibleContentProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const [fullHeight, setFullHeight] = useState(0);

  // Measure content height
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.scrollHeight;
      setFullHeight(h);
      setNeedsCollapse(h > maxCollapsedHeight);
    };

    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [children, maxCollapsedHeight]);

  const handleCollapse = useCallback(() => {
    setCollapsed(true);
    wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const isCollapsed = needsCollapse && collapsed;
  const isExpanded = needsCollapse && !collapsed;
  const hiddenLines = Math.round((fullHeight - maxCollapsedHeight) / 20);

  return (
    <div ref={wrapperRef}>
      {/* Sticky "Show less" pill — rendered when expanded, sticks below the glass header */}
      {isExpanded && (
        <div
          style={{
            position: 'sticky',
            top: 52,
            zIndex: 5,
            display: 'flex',
            justifyContent: 'center',
            paddingBottom: 4,
          }}
        >
          <button
            onClick={handleCollapse}
            className="flex items-center gap-1.5 text-xs font-medium cursor-pointer rounded-full"
            style={{
              color: 'var(--color-primary)',
              background: gradientColor,
              border: '1px solid var(--color-border)',
              padding: '4px 12px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <ChevronUpIcon size={12} />
            Show less
          </button>
        </div>
      )}

      <div
        ref={contentRef}
        style={needsCollapse ? {
          maxHeight: isCollapsed ? maxCollapsedHeight : fullHeight,
          overflow: 'hidden',
          position: 'relative',
          transition: `max-height var(--duration-slow) var(--ease-out-expo)`,
        } : undefined}
      >
        {children}
        {isCollapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 60,
              background: `linear-gradient(transparent, ${gradientColor})`,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      {needsCollapse && (
        <button
          onClick={() => collapsed ? setCollapsed(false) : handleCollapse()}
          className="flex items-center gap-1.5 mt-1.5 text-xs font-medium cursor-pointer"
          style={{
            color: 'var(--color-primary)',
            background: 'none',
            border: 'none',
            padding: '4px 0',
          }}
        >
          {collapsed ? (
            <>
              <ChevronDownIcon size={12} />
              Show more ({hiddenLines} lines)
            </>
          ) : (
            <>
              <ChevronUpIcon size={12} />
              Show less
            </>
          )}
        </button>
      )}
    </div>
  );
}
