import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;

  const sizes = { sm: 400, md: 560, lg: 720, xl: 900 };
  
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: sizes[size] }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--color-border)'
        }}>
          <h2 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-muted)', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center', transition: 'color 0.2s'
          }}
          onMouseOver={e => e.target.style.color = 'var(--color-text)'}
          onMouseOut={e => e.target.style.color = 'var(--color-text-muted)'}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
