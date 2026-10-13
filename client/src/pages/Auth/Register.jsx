import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Customer');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const user = await register(name, email, password, role);
      if (user.role === 'Staff') navigate('/staff/orders');
      else if (user.role === 'Admin') navigate('/admin/dashboard');
      else if (user.role === 'Moderator') navigate('/moderator');
      else navigate('/tables');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="container" style={{ padding: '3.5rem 1.25rem', maxWidth: 440 }}>
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: '#eff6ff', color: '#2563eb', width: 48, height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
            <UserPlus size={24} />
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Register Account</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Create an account on the Restaurant Reservation & Ordering Engine
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.6rem 0.8rem', borderRadius: 6, fontSize: '0.85rem', marginBottom: '1rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sudharsan Pandian"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
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
              placeholder="Create strong password"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="form-select">
              <option value="Customer">Customer (Diner & Ordering)</option>
              <option value="Staff">Restaurant Staff (Kitchen & Floor)</option>
              <option value="Admin">App Administrator</option>
              <option value="Moderator">Content Moderator</option>
            </select>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.65rem' }}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
