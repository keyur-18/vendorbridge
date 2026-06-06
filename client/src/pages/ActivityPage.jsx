import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { logsAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, EmptyState, formatRelative } from '../components/ui';
import { Activity, Bell, CheckCheck, FileText, ShoppingBag, Receipt, Building2, Users, CheckSquare } from 'lucide-react';

const actionIcons = {
  CREATE: FileText, UPDATE: Building2, DELETE: Building2, LOGIN: Users,
  SUBMIT: Receipt, APPROVE: CheckSquare, REJECT: CheckSquare, INVITE: Users,
  REQUEST_APPROVAL: CheckSquare, DOWNLOAD_PDF: FileText, SEND_EMAIL: Bell,
};

const actionColors = {
  CREATE: '#14B8A6', UPDATE: '#3B82F6', DELETE: '#EF4444', LOGIN: '#94A3B8',
  SUBMIT: '#F59E0B', APPROVE: '#22C55E', REJECT: '#EF4444', INVITE: '#8B5CF6',
  DOWNLOAD_PDF: '#3B82F6', SEND_EMAIL: '#F59E0B',
};

export default function ActivityPage() {
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notifications');
  const [logsTotal, setLogsTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, notifRes] = await Promise.all([
        logsAPI.getActivityLogs({ limit: 50 }),
        logsAPI.getNotifications(),
      ]);
      setLogs(logsRes.data.data);
      setLogsTotal(logsRes.data.total);
      setNotifications(notifRes.data.data);
    } catch (err) {
      toast.error('Failed to load activity data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id) => {
    try {
      await logsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await logsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All marked as read');
    } catch (err) {}
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const notifTypeConfig = {
    info: { color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
    success: { color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
    warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    error: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
    rfq: { color: '#14B8A6', bg: 'rgba(20,184,166,0.08)' },
    approval: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
    invoice: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    po: { color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity & Logs</h1>
          <p className="page-subtitle">Procurement audit trail and notifications</p>
        </div>
        {activeTab === 'notifications' && unreadCount > 0 && (
          <button className="btn-secondary" onClick={handleMarkAllRead}>
            <CheckCheck size={14} /> Mark All Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
        {[
          { key: 'notifications', label: 'Notifications', count: unreadCount, icon: Bell },
          { key: 'logs', label: 'Audit Logs', count: logsTotal, icon: Activity },
        ].map(({ key, label, count, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 16px', fontSize: 13, fontWeight: 600,
            color: activeTab === key ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
            borderBottom: activeTab === key ? '2px solid var(--color-primary-light)' : '2px solid transparent',
            marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Icon size={14} />
            {label}
            {count > 0 && (
              <span style={{ padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: activeTab === key ? 'rgba(20,184,166,0.15)' : 'var(--color-surface-2)', color: activeTab === key ? 'var(--color-primary-light)' : 'var(--color-text-muted)' }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner fullPage /> : (
        <>
          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifications.length === 0 ? (
                <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
              ) : notifications.map(notif => {
                const config = notifTypeConfig[notif.type] || notifTypeConfig.info;
                return (
                  <div key={notif.id} className="card" style={{
                    padding: '14px 18px',
                    borderLeft: `3px solid ${config.color}`,
                    background: notif.is_read ? 'var(--color-surface)' : config.bg,
                    opacity: notif.is_read ? 0.7 : 1,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }} onClick={() => !notif.is_read && handleMarkRead(notif.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          {!notif.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, flexShrink: 0 }} />}
                          <span style={{ fontWeight: notif.is_read ? 500 : 700, fontSize: 14 }}>{notif.title}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{notif.message}</div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>{formatRelative(notif.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Audit Logs Tab */}
          {activeTab === 'logs' && (
            <div className="card" style={{ padding: 0 }}>
              {logs.length === 0 ? (
                <EmptyState icon={Activity} title="No activity logs" description="Actions will be recorded here" />
              ) : (
                <div>
                  {logs.map((log, i) => {
                    const Icon = actionIcons[log.action] || Activity;
                    const color = actionColors[log.action] || '#94A3B8';
                    return (
                      <div key={log.id} style={{
                        display: 'flex', gap: 14, padding: '14px 20px',
                        borderBottom: i < logs.length - 1 ? '1px solid rgba(51,65,85,0.4)' : 'none',
                        alignItems: 'flex-start'
                      }}>
                        {/* Timeline dot */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${color}15`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={14} color={color} />
                          </div>
                          {i < logs.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--color-border)', marginTop: 6 }} />}
                        </div>
                        <div style={{ flex: 1, paddingTop: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                            <div>
                              <span style={{ fontWeight: 600, fontSize: 13, color }}>{log.action}</span>
                              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 6 }}>{log.entity_type}</span>
                              {log.user_name && <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>by <strong style={{ color: 'var(--color-text)' }}>{log.user_name}</strong></span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>{formatRelative(log.created_at)}</div>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>{log.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
