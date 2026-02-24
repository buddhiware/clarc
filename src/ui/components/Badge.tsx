interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'model';
  size?: 'sm' | 'md';
  className?: string;
}

const VARIANT_STYLES: Record<string, { bg: string; color: string; border?: string }> = {
  default: { bg: 'var(--color-surface-2)', color: 'var(--color-text-muted)' },
  primary: { bg: 'var(--color-primary-subtle)', color: 'var(--color-primary)' },
  success: { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-accent-emerald)' },
  warning: { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-accent-amber)' },
  error: { bg: 'rgba(244, 63, 94, 0.1)', color: 'var(--color-accent-rose)' },
  model: { bg: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: 'var(--color-border)' },
};

export default function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${padding} ${className}`}
      style={{
        backgroundColor: style.bg,
        color: style.color,
        border: style.border ? `1px solid ${style.border}` : undefined,
      }}
    >
      {children}
    </span>
  );
}
