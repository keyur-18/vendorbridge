import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { reportsAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, formatCurrency } from '../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { TrendingUp, Building2, DollarSign, Package, Download, Star } from 'lucide-react';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>{p.name}:</span>
            <span style={{ fontWeight: 700 }}>{typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ReportsPage() {
  const [vendorPerf, setVendorPerf] = useState([]);
  const [spending, setSpending] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [perfRes, spendRes, trendsRes] = await Promise.all([
          reportsAPI.getVendorPerformance(),
          reportsAPI.getSpending(),
          reportsAPI.getMonthlyTrends(),
        ]);
        setVendorPerf(perfRes.data.data);
        setSpending(spendRes.data.data);
        setTrends(trendsRes.data.data);
      } catch (err) {
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const res = await reportsAPI.getPDF();
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Procurement_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report PDF exported successfully!');
    } catch (err) {
      toast.error('Failed to export report PDF');
    } finally {
      setExporting(false);
    }
  };

  const monthlyData = (() => {
    const months = {};
    trends?.rfqs?.forEach(d => { const m = new Date(d.month).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }); months[m] = { ...months[m], month: m, RFQs: parseInt(d.count) }; });
    trends?.purchaseOrders?.forEach(d => { const m = new Date(d.month).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }); months[m] = { ...months[m], month: m, POs: parseInt(d.count) }; });
    trends?.invoices?.forEach(d => { const m = new Date(d.month).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }); months[m] = { ...months[m], month: m, Spend: parseFloat(d.total) }; });
    return Object.values(months);
  })();

  const spendByCategory = spending?.byCategory || [];
  const totalSpend = spendByCategory.reduce((sum, c) => sum + parseFloat(c.total || 0), 0);

  if (loading) return <Layout><LoadingSpinner fullPage /></Layout>;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Procurement insights and performance metrics</p>
        </div>
        <button className="btn-secondary" onClick={handleExportPDF} disabled={exporting}>
          {exporting ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <><Download size={14} /> Export</>}
        </button>
      </div>

      {/* Section Nav */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[
          { key: 'overview', label: 'Overview', icon: TrendingUp },
          { key: 'vendors', label: 'Vendor Performance', icon: Building2 },
          { key: 'spending', label: 'Spending', icon: DollarSign },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveSection(key)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: activeSection === key ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))' : 'var(--color-surface-2)',
            color: activeSection === key ? 'white' : 'var(--color-text-muted)',
            fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: activeSection === key ? '0 4px 16px rgba(15,118,110,0.3)' : 'none',
            transition: 'all 0.2s'
          }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Monthly Trends */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Monthly Procurement Trends</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>RFQs, Purchase Orders, and Spend over last 12 months</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData.length > 0 ? monthlyData : [{ month: 'Jan', RFQs: 3, POs: 1 }, { month: 'Feb', RFQs: 5, POs: 2 }, { month: 'Mar', RFQs: 4, POs: 3 }]} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)', paddingTop: 16 }} />
                <Bar dataKey="RFQs" fill="#6366F1" radius={[4,4,0,0]} />
                <Bar dataKey="POs" fill="#10B981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Spend Over Time */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Procurement Spending</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>Monthly invoice amounts</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData.length > 0 ? monthlyData : [{ month: 'Jan', Spend: 1200000 }, { month: 'Feb', Spend: 3500000 }, { month: 'Mar', Spend: 2800000 }]}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Spend" stroke="#3B82F6" fill="url(#spendGrad)" strokeWidth={2} name="Spend (₹)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Vendor Performance Section */}
      {activeSection === 'vendors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 15 }}>
              Vendor Performance Rankings
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Vendor</th><th>Category</th><th>Rating</th><th>Quotations</th><th>Won Bids</th><th>Purchase Orders</th><th>Total Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorPerf.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>No vendor data available</td></tr>
                  ) : vendorPerf.map((v, i) => (
                    <tr key={v.id}>
                      <td style={{ color: i < 3 ? ['#F59E0B', '#94A3B8', '#CD7C33'][i] : 'var(--color-text-muted)', fontWeight: 700 }}>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${COLORS[i % COLORS.length]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: COLORS[i % COLORS.length], fontSize: 12 }}>
                            {v.company_name?.charAt(0)}
                          </div>
                          <span style={{ fontWeight: 600 }}>{v.company_name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{v.category || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={12} color="#F59E0B" fill="#F59E0B" />
                          <span style={{ fontWeight: 600 }}>{parseFloat(v.rating || 0).toFixed(1)}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{v.total_quotations}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{v.won_bids}</span>
                        {v.total_quotations > 0 && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 4 }}>({Math.round((v.won_bids / v.total_quotations) * 100)}%)</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>{v.total_pos}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{formatCurrency(v.total_spend)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top vendors bar chart */}
          {vendorPerf.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Top Vendors by Spend</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={vendorPerf.slice(0, 8).map(v => ({ name: v.company_name?.split(' ')[0], spend: parseFloat(v.total_spend) }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="spend" fill="#6366F1" radius={[0,4,4,0]} name="Total Spend (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Spending Section */}
      {activeSection === 'spending' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Category Breakdown */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Spend by Category</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>Total: {formatCurrency(totalSpend)}</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={spendByCategory.length > 0 ? spendByCategory.map(c => ({ name: c.category || 'Other', value: parseFloat(c.total) })) : [{ name: 'Electronics', value: 4000000 }, { name: 'IT Services', value: 1200000 }, { name: 'Office', value: 500000 }]}
                  cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={2}>
                  {spendByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Table */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 700 }}>Category Breakdown</div>
            {spendByCategory.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>No spending data</div>
            ) : spendByCategory.map((cat, i) => {
              const pct = totalSpend > 0 ? (parseFloat(cat.total) / totalSpend) * 100 : 0;
              return (
                <div key={cat.category} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.category || 'Other'}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{formatCurrency(cat.total)}</div>
                  </div>
                  <div style={{ height: 4, background: 'var(--color-surface-2)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{pct.toFixed(1)}% of total</div>
                </div>
              );
            })}
          </div>

          {/* Status Breakdown */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>PO Status Breakdown</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {(spending?.byStatus || []).map((s, i) => {
                const colors = { issued: '#14B8A6', completed: '#22C55E', cancelled: '#EF4444', draft: '#94A3B8' };
                const color = colors[s.status] || '#94A3B8';
                return (
                  <div key={s.status} style={{ flex: '1 1 180px', padding: '16px', background: `${color}0a`, border: `1px solid ${color}22`, borderRadius: 10 }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color, marginBottom: 4 }}>{s.count}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>{s.status?.charAt(0).toUpperCase() + s.status?.slice(1)}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>{formatCurrency(s.total)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
