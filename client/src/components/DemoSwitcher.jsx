import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Shield, ChefHat, User, ShieldAlert, ChevronUp, ChevronDown, Radio } from 'lucide-react';

export default function DemoSwitcher() {
  const { user, quickSwitchRole, loading } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleRoleSelect = async (role) => {
    await quickSwitchRole(role);
    setIsOpen(false);
    if (role === 'Customer') navigate('/tables');
    else if (role === 'Staff') navigate('/staff/orders');
    else if (role === 'Admin') navigate('/admin/dashboard');
    else if (role === 'Moderator') navigate('/moderator');
  };

  const currentRole = user?.role || 'Customer';

  return (
    <aside
      aria-label="Demo Testing Controls"
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        fontFamily: "'Inter', -apple-system, sans-serif"
      }}
    >
      {isOpen && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 14,
            boxShadow: '0 12px 30px -4px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0',
            padding: '12px',
            marginBottom: 8,
            width: 250
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Evaluation Mode
            </span>
            <span style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4, color: isConnected ? '#16a34a' : '#d97706', fontWeight: 600 }}>
              <Radio size={10} /> {isConnected ? 'Live Engine' : 'Connecting'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { role: 'Customer', label: 'Customer (Rahul)', icon: <User size={14} />, desc: 'Order food & book tables' },
              { role: 'Staff', label: 'Kitchen Partner (Rajesh)', icon: <ChefHat size={14} />, desc: 'Live kitchen & floor manager' },
              { role: 'Admin', label: 'Platform Admin', icon: <Shield size={14} />, desc: 'Analytics & restaurant onboarding' },
              { role: 'Moderator', label: 'Review Moderator', icon: <ShieldAlert size={14} />, desc: 'Review queue & spam moderation' }
            ].map((item) => (
              <button
                key={item.role}
                onClick={() => handleRoleSelect(item.role)}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: currentRole === item.role ? '1.5px solid #e23744' : '1px solid #f1f5f9',
                  background: currentRole === item.role ? '#fff1f2' : '#ffffff',
                  color: currentRole === item.role ? '#e23744' : '#1e293b',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ color: currentRole === item.role ? '#e23744' : '#64748b' }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: currentRole === item.role ? 700 : 600 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {item.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Pill Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#0f172a',
          color: '#ffffff',
          padding: '8px 14px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 6px 16px rgba(15, 23, 42, 0.25)',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 600,
          transition: 'all 0.2s ease'
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#22c55e' : '#f59e0b' }} />
        <span>Role: <strong style={{ color: '#f8fafc' }}>{currentRole === 'Staff' ? 'Kitchen Partner' : currentRole}</strong></span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
    </aside>
  );
}
