import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Zap, Mail, Lock, ArrowRight } from 'lucide-react';
import { authTokenAtom, authUserAtom } from '../atoms';
import { authAPI } from '../api';
import { loginSchema } from '../schemas';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const setToken = useSetRecoilState(authTokenAtom);
  const setUser = useSetRecoilState(authUserAtom);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const errs = {};
      result.error.errors.forEach(e => { errs[e.path[0]] = e.message; });
      return setErrors(errs);
    }

    setLoading(true);
    try {
      const res = await authAPI.login(form);
      const { token, user } = res.data;
      localStorage.setItem('vb_token', token);
      localStorage.setItem('vb_user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (email) => {
    const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || '';
    if (!demoPassword) {
      toast.error('Demo password not configured (VITE_DEMO_PASSWORD).');
      return;
    }

    setForm({ email, password: demoPassword });
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password: demoPassword });
      const { token, user } = res.data;
      localStorage.setItem('vb_token', token);
      localStorage.setItem('vb_user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      toast.success(`Logged in as ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error('Demo login failed. Make sure the server is running and DB is seeded.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: -200, right: -200,
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(15,118,110,0.12) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: -200, left: -200,
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #0F766E, #14B8A6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(15,118,110,0.4)'
          }}>
            <Zap size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', color: 'var(--color-text)' }}>
            VendorBridge
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>
            Procurement & Vendor Management ERP
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Sign In</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 24 }}>
            Access your procurement dashboard
          </p>

          {errors.general && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--color-danger)'
            }}>
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  className="input-field"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={handleChange}
                  style={{ paddingLeft: 38 }}
                  autoComplete="email"
                />
              </div>
              {errors.email && <div className="error-text">{errors.email}</div>}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="label" style={{ margin: 0 }}>Password</label>
                <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--color-primary-light)', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  style={{ paddingLeft: 38, paddingRight: 38 }}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0
                }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <div className="error-text">{errors.password}</div>}
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }}>
              {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : (
                <><span>Sign In</span><ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Don't have an account? </span>
            <Link to="/signup" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 600 }}>
              Sign Up
            </Link>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="card-sm" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Quick Demo Login
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Admin', email: 'admin@vendorbridge.com', color: '#EF4444' },
              { label: 'Procurement', email: 'priya@vendorbridge.com', color: '#14B8A6' },
              { label: 'Manager', email: 'rahul@vendorbridge.com', color: '#F59E0B' },
              { label: 'Vendor', email: 'suresh@techsupplies.com', color: '#3B82F6' },
            ].map(({ label, email, color }) => (
              <button key={email} onClick={() => demoLogin(email)} disabled={loading} style={{
                background: `rgba(${color === '#EF4444' ? '239,68,68' : color === '#14B8A6' ? '20,184,166' : color === '#F59E0B' ? '245,158,11' : '59,130,246'},0.08)`,
                border: `1px solid ${color}33`, borderRadius: 8, padding: '8px 10px',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.background = `${color}18`}
              onMouseOut={e => e.currentTarget.style.background = `${color}10`}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color }}>{label}</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
