import { NavLink, useNavigate } from 'react-router-dom';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { authUserAtom, authTokenAtom, notificationCountAtom } from '../atoms';
import { Logo } from './ui';
import {
  LayoutDashboard, Building2, FileText, ClipboardList,
  CheckSquare, ShoppingBag, Receipt, Activity,
  BarChart3, LogOut, Bell, ChevronRight, Zap
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'procurement_officer', 'vendor', 'manager'] },
  { to: '/vendors', icon: Building2, label: 'Vendors', roles: ['admin', 'procurement_officer', 'manager'] },
  { to: '/rfqs', icon: FileText, label: 'RFQs', roles: ['admin', 'procurement_officer', 'vendor', 'manager'] },
  { to: '/quotations', icon: ClipboardList, label: 'Quotations', roles: ['vendor'] },
  { to: '/approvals', icon: CheckSquare, label: 'Approvals', roles: ['admin', 'procurement_officer', 'manager'] },
  { to: '/purchase-orders', icon: ShoppingBag, label: 'Purchase Orders', roles: ['admin', 'procurement_officer', 'manager', 'vendor'] },
  { to: '/invoices', icon: Receipt, label: 'Invoices', roles: ['admin', 'procurement_officer', 'manager', 'vendor'] },
  { to: '/activity', icon: Activity, label: 'Activity & Logs', roles: ['admin', 'procurement_officer', 'manager'] },
  { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['admin', 'manager'] },
];

export default function Sidebar() {
  const user = useRecoilValue(authUserAtom);
  const setToken = useSetRecoilState(authTokenAtom);
  const setUser = useSetRecoilState(authUserAtom);
  const notifCount = useRecoilValue(notificationCountAtom);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('vb_token');
    localStorage.removeItem('vb_user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  const filtered = navItems.filter(item => item.roles.includes(user?.role));
  
  const roleColors = {
    admin: '#EF4444',
    procurement_officer: '#14B8A6',
    manager: '#F59E0B',
    vendor: '#3B82F6',
  };

  const roleLabels = {
    admin: 'Admin',
    procurement_officer: 'Procurement',
    manager: 'Manager',
    vendor: 'Vendor',
  };

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo size={36} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>VendorBridge</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500 }}>PROCUREMENT ERP</div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {filtered.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span style={{ flex: 1 }}>{label}</span>
            {to === '/activity' && notifCount > 0 && (
              <span style={{
                background: 'var(--color-danger)', color: 'white', fontSize: 10,
                fontWeight: 700, padding: '2px 6px', borderRadius: 10,
              }}>{notifCount}</span>
            )}
          </NavLink>
        ))}
      </div>

      {/* User Profile */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', background: 'var(--color-surface-2)',
          borderRadius: 10, marginBottom: 8
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: `linear-gradient(135deg, ${roleColors[user?.role] || '#0F766E'}, ${roleColors[user?.role] || '#14B8A6'}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: roleColors[user?.role] || 'var(--color-text-muted)', fontWeight: 500 }}>
              {roleLabels[user?.role]}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '8px', fontSize: 13 }}>
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </nav>
  );
}
