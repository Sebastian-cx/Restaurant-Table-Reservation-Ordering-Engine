import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Star, Flag, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export default function Reviews() {
  const { user, token, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('1');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = () => {
    fetch('/api/reviews')
      .then((res) => res.json())
      .then((data) => setReviews(data.reviews || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchReviews();
    fetch('/api/admin/restaurants')
      .then((res) => res.json())
      .then((data) => setRestaurants(data.restaurants || []))
      .catch(console.error);
  }, []);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    setMessage('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          restaurantId: Number(selectedRestaurantId),
          rating: Number(rating),
          comment
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage('Thank you! Your dining review has been posted.');
      setComment('');
      fetchReviews();
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlagReview = async (id) => {
    try {
      const res = await fetch(`/api/reviews/${id}/flag`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      alert('Review flagged and submitted to Moderator Queue for inspection.');
      fetchReviews();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
          Customer Reviews & Dining Feedback
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Share your culinary experiences and help uphold community quality standards
        </p>
      </div>

      {message && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      <div className="grid-2" style={{ gap: '2rem' }}>
        {/* Write a Review */}
        <div className="card">
          <h2 className="card-title">Share Your Experience</h2>
          {isAuthenticated ? (
            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label className="form-label">Restaurant</label>
                <select
                  value={selectedRestaurantId}
                  onChange={(e) => setSelectedRestaurantId(e.target.value)}
                  className="form-select"
                >
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Rating (1 to 5 Stars)</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    >
                      <Star
                        size={24}
                        fill={star <= rating ? '#eab308' : 'none'}
                        color={star <= rating ? '#eab308' : '#cbd5e1'}
                      />
                    </button>
                  ))}
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, marginLeft: '0.5rem' }}>
                    {rating} / 5 Stars
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Comments</label>
                <textarea
                  rows={3}
                  placeholder="How was the food, ambiance, and table service?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="form-textarea"
                  required
                />
              </div>

              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%' }}>
                <Send size={15} /> {submitting ? 'Submitting...' : 'Post Review'}
              </button>
            </form>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Please login or switch to Customer role above to post a review.
            </p>
          )}
        </div>

        {/* Existing Reviews Feed */}
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#0f172a' }}>
            Recent Verified Reviews ({reviews.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((rev) => (
              <div key={rev.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{rev.customerName}</span>
                    <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          fill={s <= rev.rating ? '#eab308' : 'none'}
                          color={s <= rev.rating ? '#eab308' : '#cbd5e1'}
                        />
                      ))}
                    </div>
                  </div>

                  {user && (
                    <button
                      onClick={() => handleFlagReview(rev.id)}
                      title="Flag review for Moderator review"
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                    >
                      <Flag size={13} /> Report
                    </button>
                  )}
                </div>

                <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.4 }}>
                  {rev.comment}
                </p>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                  {new Date(rev.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
