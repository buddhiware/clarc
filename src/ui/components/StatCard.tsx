interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  gradient?: string;
}

export default function StatCard({ label, value, icon, gradient }: StatCardProps) {
  return (
    <div
      className="card card-glow p-4 relative overflow-hidden"
      style={{ borderTop: gradient ? `3px solid transparent` : undefined }}
    >
      {gradient && (
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: gradient }}
        />
      )}
      {icon && (
        <div
          className="absolute top-3 right-3 opacity-15"
          style={{ color: 'var(--color-primary)' }}
        >
          {icon}
        </div>
      )}
      <div className="animate-number text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
    </div>
  );
}
