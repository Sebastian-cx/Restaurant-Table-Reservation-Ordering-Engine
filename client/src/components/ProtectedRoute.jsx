import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="container" style={{ padding: '3rem 1.25rem', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem' }}>
          <ShieldAlert size={48} color="#dc2626" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Access Denied (403 Forbidden)</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Your current role is <strong>{user.role}</strong>. This section requires one of the following permissions:{' '}
            <code>{allowedRoles.join(', ')}</code>.
          </p>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Use the <strong>Switch Demo Role</strong> bar at the top to toggle to an authorized role.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
