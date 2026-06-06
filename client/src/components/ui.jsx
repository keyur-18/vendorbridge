export function LoadingSpinner({ size = 32, fullPage = false }) {
  const spinner = (
    <div style={{
      width: size, height: size, border: `${size / 10}px solid var(--color-border)`,
      borderTopColor: 'var(--color-primary-light)', borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
  );

  if (fullPage) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', flexDirection: 'column', gap: 16
      }}>
        {spinner}
        <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  return spinner;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />}
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{title}</div>
      {description && <div style={{ fontSize: 14, marginBottom: 16 }}>{description}</div>}
      {action}
    </div>
  );
}

export function ErrorBoundaryFallback({ message = 'Something went wrong' }) {
  return (
    <div style={{
      padding: 40, textAlign: 'center', color: 'var(--color-danger)',
      background: 'rgba(239,68,68,0.05)', borderRadius: 12,
      border: '1px solid rgba(239,68,68,0.2)'
    }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Error</div>
      <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{message}</div>
    </div>
  );
}

// Currency formatter for INR
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// Date formatter
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

// Relative time
export const formatRelative = (dateStr) => {
  if (!dateStr) return '—';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
};
