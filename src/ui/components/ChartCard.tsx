import { ResponsiveContainer } from 'recharts';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  height?: number;
  children: React.ReactNode;
  className?: string;
}

export default function ChartCard({ title, subtitle, height = 200, children, className = '' }: ChartCardProps) {
  return (
    <div
      className={`card p-4 ${className}`}
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        {children as any}
      </ResponsiveContainer>
    </div>
  );
}
