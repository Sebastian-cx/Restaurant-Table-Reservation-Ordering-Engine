import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { CalendarCheck, MapPin, Users, Clock, XCircle, CheckCircle2, Radio } from 'lucide-react';

export default function MyReservations() {
  const { token } = useAuth();
  const { socket, isConnected } = useSocket();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchReservations = async () => {
    try {
      const res = await fetch('/api/tables/my-reservations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setReservations(data.reservations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [token]);

  // Real-time synchronization for table bookings and status updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchReservations();
    };

    socket.on('table_reserved', handleUpdate);
    socket.on('new_reservation', handleUpdate);
    socket.on('reservation_cancelled', handleUpdate);
    socket.on('reservation_status_updated', handleUpdate);
    socket.on('table_status_updated', handleUpdate);

    return () => {
      socket.off('table_reserved', handleUpdate);
      socket.off('new_reservation', handleUpdate);
      socket.off('reservation_cancelled', handleUpdate);
      socket.off('reservation_status_updated', handleUpdate);
      socket.off('table_status_updated', handleUpdate);
    };
  }, [socket]);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      const res = await fetch(`/api/tables/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Reservation cancelled successfully.');
      fetchReservations();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            My Table Reservations
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Overview of all upcoming and past dining table reservations
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: isConnected ? '#16a34a' : '#d97706', background: isConnected ? '#f0fdf4' : '#fffbeb', padding: '5px 12px', borderRadius: 6, border: '1px solid', borderColor: isConnected ? '#bbf7d0' : '#fde68a' }}>
          <Radio size={14} /> {isConnected ? 'Live Sync Active' : 'Connecting to Live Engine...'}
        </div>
      </div>

      {message && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1.25rem' }}>
          {message}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading reservations...</p>
      ) : reservations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <CalendarCheck size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>No reservations found</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Reserve your table at one of our fine dining venues.</p>
        </div>
      ) : (
        <div className="grid-2" style={{ gap: '1.25rem' }}>
          {reservations.map((res) => (
            <div key={res.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{res.restaurantName}</h3>
                  <span className={`badge ${res.status === 'Confirmed' ? 'badge-success' : 'badge-danger'}`}>
                    {res.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} /> {res.restaurantAddress}
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#64748b' }}>Table Number:</span>
                    <strong>{res.tableNumber} (Capacity: {res.capacity})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#64748b' }}>Date & Time:</span>
                    <strong>{res.reservationDate} at {res.timeSlot}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Party Size:</span>
                    <span>{res.guestsCount} Guests</span>
                  </div>
                  {res.specialRequests && (
                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                      {res.specialRequests.includes('[Pre-Orders:') ? (
                        <div>
                          <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontSize: '0.72rem', display: 'inline-block', marginBottom: '4px' }}>
                            ⚡ Pre-Ordered Starters
                          </span>
                          <div>{res.specialRequests}</div>
                        </div>
                      ) : (
                        <em>"{res.specialRequests}"</em>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `🍽️ FeastHub Chennai Table Pass\nVenue: ${res.restaurantName}\nTable: ${res.tableNumber}\nDate & Time: ${res.reservationDate} at ${res.timeSlot}\nGuests: ${res.guestsCount}\nBooking Ref: #FST-${res.id}\n📍 ${res.restaurantAddress}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ color: '#16a34a', borderColor: '#bbf7d0', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  💬 Share Pass
                </a>
                {res.status === 'Confirmed' && (
                  <button
                    onClick={() => handleCancel(res.id)}
                    className="btn btn-outline btn-sm"
                    style={{ color: '#dc2626', borderColor: '#fecaca' }}
                  >
                    <XCircle size={14} /> Cancel Booking
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
