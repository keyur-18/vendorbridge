import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Zap, User, Mail, Lock, ArrowRight } from 'lucide-react';
import { authTokenAtom, authUserAtom } from '../atoms';
import { authAPI } from '../api';
import { registerSchema } from '../schemas';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'procurement_officer' });
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
    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const errs = {};
      result.error.errors.forEach(e => { errs[e.path[0]] = e.message; });
      return setErrors(errs);
    }

    setLoading(true);
    try {
      const res = await authAPI.register({ name: form.name, email: form.email, password: form.password, role: form.role });
      const { token, user } = res.data;
      localStorage.setItem('vb_token', token);
      localStorage.setItem('vb_user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', top: -200, left: -200, width: 600, height: 600,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(15,118,110,0.12) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #0F766E, #14B8A6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(15,118,110,0.4)'
          }}>
            <Zap size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px' }}>VendorBridge</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>Create your procurement account</p>
        </div>

        <div className="card" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Create Account</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 24 }}>Join the procurement platform</p>

          {errors.general && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--color-danger)'
            }}>{errors.general}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input id="signup-name" name="name" type="text" className="input-field" placeholder="John Doe" value={form.name} onChange={handleChange} style={{ paddingLeft: 38 }} />
              </div>
              {errors.name && <div className="error-text">{errors.name}</div>}
            </div>

            <div>
              <label className="label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input id="signup-email" name="email" type="email" className="input-field" placeholder="you@company.com" value={form.email} onChange={handleChange} style={{ paddingLeft: 38 }} />
              </div>
              {errors.email && <div className="error-text">{errors.email}</div>}
            </div>

            <div>
              <label className="label">Role</label>
              <select id="signup-role" name="role" className="input-field" value={form.role} onChange={handleChange}>
                <option value="procurement_officer">Procurement Officer</option>
                <option value="manager">Manager / Approver</option>
                <option value="vendor">Vendor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input id="signup-password" name="password" type={showPassword ? 'text' : 'password'} className="input-field" placeholder="Min 8 chars, 1 uppercase, 1 number" value={form.password} onChange={handleChange} style={{ paddingLeft: 38, paddingRight: 38 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <div className="error-text">{errors.password}</div>}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input id="signup-confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} className="input-field" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} style={{ paddingLeft: 38 }} />
              </div>
              {errors.confirmPassword && <div className="error-text">{errors.confirmPassword}</div>}
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }}>
              {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : (
                <><span>Create Account</span><ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Already have an account? </span>
            <Link to="/login" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
