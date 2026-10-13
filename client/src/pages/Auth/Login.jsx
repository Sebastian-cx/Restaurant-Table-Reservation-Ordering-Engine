import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, ArrowRight, Zap } from 'lucide-react';

export default function Login() {
  const { login, quickLoginByEmail, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const redirectByRole = (user) => {
    if (user.role === 'Staff') navigate('/staff/orders');
    else if (user.role === 'Admin') navigate('/admin/dashboard');
    else if (user.role === 'Moderator') navigate('/moderator');
    else navigate(from === '/login' ? '/' : from);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const loggedUser = await login(email, password);
      redirectByRole(loggedUser);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed.');
    }
  };

  const handleInstantLogin = async (emailAddr) => {
    setErrorMsg('');
    try {
      const user = await quickLoginByEmail(emailAddr);
      redirectByRole(user);
    } catch (err) {
      setErrorMsg(err.message || 'Instant login failed.');
    }
  };

  const demoAccounts = [
    { name: 'Rahul Sharma', email: 'customer@demo.com', role: 'Customer', emoji: '🛒' },
    { name: 'Sebastian', email: 'sebastian@demo.com', role: 'Customer', emoji: '🛒' },
    { name: 'Tashu', email: 'tashu@demo.com', role: 'Customer', emoji: '🛒' },
    { name: 'Rishika', email: 'rishika@demo.com', role: 'Customer', emoji: '🛒' },
    { name: 'Arjun', email: 'arjun@demo.com', role: 'Customer', emoji: '🛒' },
    { name: 'Ananya', email: 'ananya@demo.com', role: 'Customer', emoji: '🛒' },
    { name: 'Chef Rajesh', email: 'staff@demo.com', role: 'Staff', emoji: '👨‍🍳' },
    { name: 'Platform Admin', email: 'admin@demo.com', role: 'Admin', emoji: '🛡️' },
    { name: 'Trust & Safety', email: 'moderator@demo.com', role: 'Moderator', emoji: '👁️' },
  ];

  const roleColors = {
    Customer: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
    Staff: { bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
    Admin: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
    Moderator: { bg: '#f5f3ff', border: '#ddd6fe', text: '#7c3aed' },
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem', maxWidth: 480 }}>
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: '#eff6ff', color: '#2563eb', width: 48, height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
            <LogIn size={24} />
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Account Login</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Sign in to access your reservation and ordering dashboard
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.6rem 0.8rem', borderRadius: 6, fontSize: '0.85rem', marginBottom: '1rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. customer@demo.com"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="form-input"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.65rem' }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* ⚡ 1-Click Instant Login for All Test Accounts */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Zap size={14} style={{ color: '#f59e0b' }} />
            1-Click Instant Login (No Password)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {demoAccounts.map((acc) => {
              const rc = roleColors[acc.role];
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleInstantLogin(acc.email)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    background: rc.bg,
                    border: `1px solid ${rc.border}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    width: '100%',
                    textAlign: 'left',
                    fontSize: '0.82rem',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <span style={{ fontSize: '1rem' }}>{acc.emoji}</span>
                  <span style={{ fontWeight: 600, color: rc.text, flex: 1 }}>{acc.name}</span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: rc.text,
                    background: `${rc.text}15`,
                    padding: '0.15rem 0.45rem',
                    borderRadius: 4,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}>
                    {acc.role}
                  </span>
                  <ArrowRight size={14} style={{ color: rc.text, opacity: 0.6 }} />
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
