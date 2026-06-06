import { useState } from 'react';

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

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

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

export function Logo({ size = 36 }) {
  const [useFallback, setUseFallback] = useState(false);

  if (useFallback) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        <defs>
          {/* Background Gradient */}
          <linearGradient id="bgGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          
          {/* Monogram Gradient (White to Light Lavender) */}
          <linearGradient id="vbGrad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="30%" stopColor="#FFFFFF" />
            <stop offset="80%" stopColor="#E0E7FF" />
          </linearGradient>

          {/* Bottom Blue Glow */}
          <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>

          <mask id="monogramMask">
            {/* White base (visible) */}
            <rect width="100" height="100" fill="white" />
            {/* Black deck cutout (hides bottom legs) */}
            <path d="M 0 74 C 30 66, 70 66, 100 74 V 100 H 0 Z" fill="black" />
            {/* Black B-counters (hides loop holes) */}
            <path d="M 52 38 H 66 C 70 38, 73 40, 73 44 C 73 48, 70 49, 66 49 H 48 Z" fill="black" />
            <path d="M 44 56 H 68 C 73 56, 76 59, 76 64 C 76 69, 73 71, 68 71 H 38 Z" fill="black" />
          </mask>
        </defs>

        {/* Background Card */}
        <rect width="100" height="100" rx="28" fill="url(#bgGrad)" />

        {/* Monogram Group (Masked) */}
        <g mask="url(#monogramMask)">
          {/* V Shape */}
          <path d="M 18 31 H 30 L 40 55 L 50 31 H 62 L 40 78 Z" fill="url(#vbGrad)" />
          {/* B Shape (Solid loop base) */}
          <path d="M 50 31 H 68 C 76 31, 82 35, 82 43 C 82 50, 76 52, 70 54 C 78 55, 85 58, 85 68 C 85 76, 78 78, 68 78 H 40 Z" fill="url(#vbGrad)" />
        </g>

        {/* Bottom Blue Glow */}
        <ellipse cx="50" cy="82" rx="30" ry="10" fill="url(#glowGrad)" style={{ mixBlendMode: 'screen' }} />

        {/* Bridge Structure */}
        {/* Left & Right Hangers */}
        <g stroke="white" strokeWidth="1" opacity="0.8">
          <line x1="21" y1="65" x2="21" y2="71" />
          <line x1="28" y1="60" x2="28" y2="69" />
          <line x1="35" y1="56" x2="35" y2="67" />
          <line x1="42" y1="53" x2="42" y2="66" />
          
          <line x1="58" y1="53" x2="58" y2="66" />
          <line x1="65" y1="56" x2="65" y2="67" />
          <line x1="72" y1="60" x2="72" y2="69" />
          <line x1="79" y1="65" x2="79" y2="71" />
        </g>

        {/* Main Suspension Cables */}
        <path d="M 50 52 Q 30 64, 13 74" stroke="white" strokeWidth="1.5" fill="none" />
        <path d="M 50 52 Q 70 64, 87 74" stroke="white" strokeWidth="1.5" fill="none" />

        {/* Central Tower */}
        <path d="M 47.5 74 L 47.5 54 L 50 50 V 74 Z" fill="#CBD5E1" />
        <path d="M 50 74 V 50 L 52.5 54 L 52.5 74 Z" fill="#FFFFFF" />

        {/* Bridge Deck Arch */}
        <path d="M 13 74 C 30 66, 70 66, 87 74" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <img
      src="/logo.png"
      alt="VendorBridge"
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        borderRadius: '24%'
      }}
      onError={() => setUseFallback(true)}
    />
  );
}
