import { useState, useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import { Link } from 'react-router-dom';
import { authUserAtom } from '../atoms';
import { reportsAPI, rfqsAPI, approvalsAPI } from '../api';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import { LoadingSpinner, formatCurrency, formatDate, formatRelative } from '../components/ui';
import {
  FileText, CheckSquare, ShoppingBag, Receipt,
  Building2, TrendingUp, ArrowRight, AlertCircle,
  Plus, Clock, DollarSign, Activity
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6'];

export default function DashboardPage() {
  const user = useRecoilValue(authUserAtom);
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, trendsRes] = await Promise.all([
          reportsAPI.getDashboard(),
          reportsAPI.getMonthlyTrends(),
        ]);
        setData(dashRes.data.data);
        setTrends(trendsRes.data.data);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Layout><LoadingSpinner fullPage /></Layout>;

  const stats = data?.stats || {};
  const rfqChartData = trends?.rfqs?.map(d => ({
    month: new Date(d.month).toLocaleDateString('en-IN', { month: 'short' }),
    RFQs: parseInt(d.count),
    POs: 0,
  })) || [];
  
  trends?.purchaseOrders?.forEach(d => {
    const month = new Date(d.month).toLocaleDateString('en-IN', { month: 'short' });
    const existing = rfqChartData.find(x => x.month === month);
    if (existing) existing.POs = parseInt(d.count);
  });

  const rfqPieData = data?.rfqStats?.map(s => ({
    name: s.status?.charAt(0).toUpperCase() + s.status?.slice(1),
    value: parseInt(s.count),
  })) || [];

  return (
    <Layout>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="page-subtitle">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {user?.role !== 'vendor' && (
            <Link to="/rfqs" state={{ openCreateModal: true }} className="btn-primary" style={{ textDecoration: 'none' }}>
              <Plus size={16} /> New RFQ
            </Link>
          )}
          {['admin', 'procurement_officer'].includes(user?.role) && (
            <Link to="/vendors" state={{ openCreateModal: true }} className="btn-secondary" style={{ textDecoration: 'none' }}>
              <Building2 size={16} /> Add Vendor
            </Link>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Pending Approvals', value: stats.pendingApprovals || 0, icon: AlertCircle, color: '#F59E0B', link: '/approvals?status=pending', urgent: stats.pendingApprovals > 0 },
          { label: 'Active RFQs', value: stats.activeRFQs || 0, icon: FileText, color: '#14B8A6', link: '/rfqs' },
          { label: 'Active Vendors', value: stats.totalVendors || 0, icon: Building2, color: '#3B82F6', link: '/vendors' },
          { label: 'Total Spend', value: formatCurrency(stats.totalSpend), icon: DollarSign, color: '#22C55E', link: '/reports', isText: true },
        ].map(({ label, value, icon: Icon, color, link, urgent, isText }) => (
          <Link to={link} key={label} style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{
              borderTop: `3px solid ${color}`,
              boxShadow: urgent ? `0 0 20px ${color}33` : undefined
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: 8 }}>{label}</div>
                  <div style={{ fontSize: isText ? 20 : 32, fontWeight: 800, color: urgent ? color : 'var(--color-text)', lineHeight: 1 }}>
                    {value}
                  </div>
                </div>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={color} />
                </div>
              </div>
              {urgent && <div style={{ fontSize: 11, color, marginTop: 8, fontWeight: 600 }}>⚠ Requires action</div>}
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Area Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Procurement Trends</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Last 12 months activity</div>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#6366F1' }} />
                <span style={{ color: 'var(--color-text-muted)' }}>RFQs</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#10B981' }} />
                <span style={{ color: 'var(--color-text-muted)' }}>POs</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={rfqChartData.length > 0 ? rfqChartData : [{ month: 'Jan', RFQs: 3, POs: 1 }, { month: 'Feb', RFQs: 5, POs: 2 }, { month: 'Mar', RFQs: 2, POs: 3 }, { month: 'Apr', RFQs: 8, POs: 4 }]}>
              <defs>
                <linearGradient id="rfqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="poGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)' }} />
              <Area type="monotone" dataKey="RFQs" stroke="#6366F1" fill="url(#rfqGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="POs" stroke="#10B981" fill="url(#poGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>RFQ Status</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>Breakdown by status</div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={rfqPieData.length > 0 ? rfqPieData : [{ name: 'Open', value: 2 }, { name: 'Draft', value: 1 }, { name: 'Awarded', value: 1 }]}
                cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                paddingAngle={3} dataKey="value"
              >
                {rfqPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
            {(rfqPieData.length > 0 ? rfqPieData : [{ name: 'Open', value: 2 }, { name: 'Draft', value: 1 }]).map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                <span style={{ color: 'var(--color-text-muted)' }}>{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Recent POs */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={16} color="var(--color-primary-light)" /> Recent POs
            </div>
            <Link to="/purchase-orders" style={{ fontSize: 12, color: 'var(--color-primary-light)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div>
            {(data?.recentPOs || []).length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No purchase orders yet</div>
            ) : (
              data.recentPOs.map(po => (
                <Link to={`/purchase-orders/${po.id}`} key={po.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(51,65,85,0.4)', textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(20,184,166,0.03)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{po.po_number}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{po.vendor_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary-light)' }}>{formatCurrency(po.total_amount)}</div>
                    <Badge status={po.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Receipt size={16} color="var(--color-primary-light)" /> Recent Invoices
            </div>
            <Link to="/invoices" style={{ fontSize: 12, color: 'var(--color-primary-light)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div>
            {(data?.recentInvoices || []).length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No invoices yet</div>
            ) : (
              data.recentInvoices.map(inv => (
                <Link to={`/invoices/${inv.id}`} key={inv.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(51,65,85,0.4)', textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(20,184,166,0.03)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{inv.invoice_number}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{inv.vendor_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary-light)' }}>{formatCurrency(inv.total_amount)}</div>
                    <Badge status={inv.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
