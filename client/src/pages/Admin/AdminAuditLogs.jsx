import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileText, Clock, User, Shield } from 'lucide-react';

export default function AdminAuditLogs() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
          Platform Audit Logs & Security Trail (Admin Portal)
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Cryptographic HMAC verification, authorization changes, reservations, and critical system events
        </p>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading audit trail...</p>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Timestamp</th>
                <th>Action Type</th>
                <th>Triggered By</th>
                <th>Role</th>
                <th>Details & Payload</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>#{log.id}</td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span className="badge badge-primary" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.userName || 'System / Anonymous'}</td>
                  <td>
                    {log.userRole ? (
                      <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>
                        {log.userRole}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#334155' }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
