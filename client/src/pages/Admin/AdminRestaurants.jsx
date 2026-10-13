import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Check, X, MapPin, Clock } from 'lucide-react';

export default function AdminRestaurants() {
  const { token } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [openingHours, setOpeningHours] = useState('11:00 AM - 11:00 PM');

  const fetchRestaurants = async () => {
    try {
      const res = await fetch('/api/admin/restaurants');
      const data = await res.json();
      setRestaurants(data.restaurants || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleToggleApproval = async (id, currentStatus) => {
    try {
      const res = await fetch(`/api/admin/restaurants/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_approved: !currentStatus })
      });
      const data = await res.json();
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_approved: currentStatus ? 0 : 1 } : r))
      );
    } catch (err) {
      alert('Failed to update approval status');
    }
  };

  const handleCreateRestaurant = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, address, cuisine, openingHours })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowAddForm(false);
      setName('');
      setAddress('');
      setCuisine('');
      fetchRestaurants();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            Restaurant Onboarding & Approvals (Admin Portal)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Manage merchant venues, floor layouts, and partner onboarding approvals
          </p>
        </div>

        <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary">
          <Plus size={16} /> {showAddForm ? 'Close Form' : 'Onboard New Restaurant'}
        </button>
      </div>

      {showAddForm && (
        <div className="card" style={{ marginBottom: '1.5rem', background: '#f8fafc', borderColor: '#bfdbfe' }}>
          <h2 className="card-title">Onboard New Restaurant</h2>
          <form onSubmit={handleCreateRestaurant} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Restaurant Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input" required />
            </div>

            <div className="form-group">
              <label className="form-label">Cuisine Category</label>
              <input type="text" value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="e.g. Italian, North Indian" className="form-input" required />
            </div>

            <div className="form-group">
              <label className="form-label">Opening Hours</label>
              <input type="text" value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} className="form-input" required />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full street address and city" className="form-input" required />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn btn-primary">Register & Initialize Tables</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid-3">
        {restaurants.map((r) => (
          <div key={r.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{r.name}</h3>
                <span className={`badge ${r.is_approved ? 'badge-success' : 'badge-warning'}`}>
                  {r.is_approved ? 'Approved' : 'Pending'}
                </span>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} /> {r.address}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} /> {r.openingHours}
              </div>

              <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1rem' }}>
                <strong>Cuisine:</strong> {r.cuisine}
              </div>
            </div>

            <button
              onClick={() => handleToggleApproval(r.id, r.is_approved)}
              className={`btn btn-sm ${r.is_approved ? 'btn-outline' : 'btn-success'}`}
              style={{ width: '100%' }}
            >
              {r.is_approved ? 'Suspend / Revoke Approval' : 'Approve Restaurant'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
