interface SkeletonProps {
  variant?: 'text' | 'title' | 'card' | 'stat' | 'chart' | 'circle' | 'bar';
  width?: string | number;
  height?: string | number;
  className?: string;
}

const VARIANT_STYLES: Record<string, { width: string | number; height: string | number; borderRadius: string | number }> = {
  text: { width: '100%', height: 14, borderRadius: 6 },
  title: { width: '60%', height: 24, borderRadius: 8 },
  card: { width: '100%', height: 120, borderRadius: 14 },
  stat: { width: '100%', height: 90, borderRadius: 14 },
  chart: { width: '100%', height: 200, borderRadius: 14 },
  circle: { width: 40, height: 40, borderRadius: '50%' },
  bar: { width: '100%', height: 8, borderRadius: 4 },
};

export function Skeleton({ variant = 'text', width, height, className = '' }: SkeletonProps) {
  const base = VARIANT_STYLES[variant] || VARIANT_STYLES.text;
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width ?? base.width,
        height: height ?? base.height,
        borderRadius: base.borderRadius,
      }}
    />
  );
}

export function SkeletonGroup({ count = 3, gap = 8 }: { count?: number; gap?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} variant="text" width={`${85 - i * 10}%`} />
      ))}
    </div>
  );
}
