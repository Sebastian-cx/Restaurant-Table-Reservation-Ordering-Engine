import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  CalendarCheck,
  Users,
  CheckCircle,
  XCircle,
  ToggleLeft,
  Clock,
  MapPin
} from 'lucide-react';

export default function StaffTables() {
  const { token } = useAuth();
  const { socket } = useSocket();

  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [tableRes, resRes] = await Promise.all([
        fetch('/api/tables?restaurantId=1', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/tables/staff-reservations?restaurantId=1', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const tableData = await tableRes.json();
      const resData = await resRes.json();

      setTables(tableData.tables || []);
      setReservations(resData.reservations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    socket.on('table_reserved', fetchData);
    socket.on('new_reservation', fetchData);
    socket.on('reservation_cancelled', fetchData);
    socket.on('reservation_status_updated', fetchData);
    socket.on('table_status_updated', fetchData);
    socket.on('table_locked', fetchData);
    socket.on('table_unlocked', fetchData);

    return () => {
      socket.off('table_reserved', fetchData);
      socket.off('new_reservation', fetchData);
      socket.off('reservation_cancelled', fetchData);
      socket.off('reservation_status_updated', fetchData);
      socket.off('table_status_updated', fetchData);
      socket.off('table_locked', fetchData);
      socket.off('table_unlocked', fetchData);
    };
  }, [socket]);

  const handleUpdateStatus = async (tableId, currentStatus) => {
    const nextStatus =
      currentStatus === 'Available' ? 'Occupied' :
      currentStatus === 'Occupied' ? 'Reserved' : 'Available';

    try {
      const res = await fetch(`/api/tables/${tableId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, status: nextStatus } : t))
      );
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
          Floor Management & Incoming Bookings (Staff Portal)
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Real-time table occupancy toggle and dining reservation queue
        </p>
      </div>

      <div className="grid-2" style={{ gap: '1.75rem' }}>
        {/* Table Floor Grid */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Physical Table Grid</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Click card to cycle occupancy state</span>
          </div>

          <div className="grid-2" style={{ gap: '0.75rem' }}>
            {tables.map((t) => (
              <div
                key={t.id}
                onClick={() => handleUpdateStatus(t.id, t.status)}
                style={{
                  background:
                    t.status === 'Available' ? '#f0fdf4' :
                    t.status === 'Occupied' ? '#eff6ff' : '#fef2f2',
                  borderColor:
                    t.status === 'Available' ? '#bbf7d0' :
                    t.status === 'Occupied' ? '#bfdbfe' : '#fecaca',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderRadius: 6,
                  padding: '0.75rem',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700 }}>{t.tableNumber}</span>
                  <span className={`badge ${
                    t.status === 'Available' ? 'badge-success' :
                    t.status === 'Occupied' ? 'badge-primary' : 'badge-danger'
                  }`} style={{ fontSize: '0.7rem' }}>
                    {t.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Capacity: {t.capacity} Guests • {t.floor_zone}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#2563eb', marginTop: '0.35rem', fontWeight: 500 }}>
                  Click to switch status →
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incoming Reservations Queue */}
        <div className="card">
          <h2 className="card-title">Live Reservation Queue ({reservations.length})</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 520, overflowY: 'auto' }}>
            {reservations.map((res) => (
              <div key={res.id} style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    Table {res.tableNumber} • {res.reservationDate} at {res.timeSlot}
                  </span>
                  <span className={`badge ${res.status === 'Confirmed' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                    {res.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                  <strong>Guest:</strong> {res.customerName} ({res.customerEmail})
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Party size: {res.guestsCount} Guests
                </div>

                {res.specialRequests && (
                  <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', background: '#f8fafc', padding: '0.3rem 0.5rem', borderRadius: 4, color: '#334155' }}>
                    <em>Notes: "{res.specialRequests}"</em>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
