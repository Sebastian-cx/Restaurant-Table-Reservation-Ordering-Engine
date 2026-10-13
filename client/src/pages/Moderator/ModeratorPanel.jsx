import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Flag, Check, EyeOff, Trash2, CheckCircle2 } from 'lucide-react';

export default function ModeratorPanel() {
  const { token } = useAuth();
  const [flaggedReviews, setFlaggedReviews] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/moderator/queue', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setFlaggedReviews(data.flaggedReviews || []);
      setAllReviews(data.allReviews || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [token]);

  const handleResolve = async (reviewId, action) => {
    try {
      const res = await fetch(`/api/moderator/reviews/${reviewId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMessage(`Review #${reviewId} resolved: ${action}`);
      fetchQueue();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
          Content Moderation & Review Oversight (Moderator Module)
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Inspect user-reported reviews, enforce platform policies, and resolve spam or abusive content
        </p>
      </div>

      {statusMessage && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Flagged Queue */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '6px', borderRadius: 4 }}>
            <Flag size={18} />
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Flagged Review Queue ({flaggedReviews.length})
          </h2>
        </div>

        {loading ? (
          <p style={{ color: '#64748b' }}>Checking moderation queue...</p>
        ) : flaggedReviews.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#16a34a', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <ShieldCheck size={36} style={{ margin: '0 auto 0.5rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Moderation Queue Clear</h3>
            <p style={{ fontSize: '0.85rem' }}>No user-flagged reviews or inappropriate content pending review.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {flaggedReviews.map((rev) => (
              <div key={rev.id} className="card" style={{ borderColor: '#fecaca', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Review #{rev.id}</span>
                    <span className="badge badge-danger" style={{ marginLeft: '8px' }}>
                      Flagged for Inspection
                    </span>
                    {rev.isHidden ? (
                      <span className="badge badge-warning" style={{ marginLeft: '4px' }}>Hidden</span>
                    ) : null}
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                      Author: <strong>{rev.customerName}</strong> ({rev.customerEmail}) • Restaurant: <strong>{rev.restaurantName}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Rating: <strong>{rev.rating} / 5 Stars</strong> • {new Date(rev.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ background: '#fef2f2', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.875rem', color: '#991b1b', marginBottom: '1rem' }}>
                  "{rev.comment}"
                </div>

                {/* Moderation Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleResolve(rev.id, 'dismiss_flag')}
                    className="btn btn-sm btn-outline"
                    style={{ borderColor: '#bbf7d0', color: '#16a34a' }}
                  >
                    <Check size={14} /> Dismiss Flag (Legitimate Review)
                  </button>

                  <button
                    onClick={() => handleResolve(rev.id, 'hide_review')}
                    className="btn btn-sm btn-outline"
                    style={{ borderColor: '#fde68a', color: '#d97706' }}
                  >
                    <EyeOff size={14} /> Hide Review from Public
                  </button>

                  <button
                    onClick={() => handleResolve(rev.id, 'delete_review')}
                    className="btn btn-sm btn-danger"
                  >
                    <Trash2 size={14} /> Delete Inappropriate Content
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Audit */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#0f172a' }}>
          Recent Public Community Reviews
        </h2>

        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Author</th>
                <th>Restaurant</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allReviews.map((r) => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td><strong>{r.customerName}</strong></td>
                  <td>{r.restaurantName}</td>
                  <td>{r.rating} ★</td>
                  <td style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.comment}
                  </td>
                  <td>
                    <span className={`badge ${r.isFlagged ? 'badge-danger' : r.isHidden ? 'badge-warning' : 'badge-success'}`}>
                      {r.isFlagged ? 'Flagged' : r.isHidden ? 'Hidden' : 'Approved'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
