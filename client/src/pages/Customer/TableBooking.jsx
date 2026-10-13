import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  Calendar,
  Clock,
  Users,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';

const TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30',
  '19:00', '19:30', '20:00', '20:30', '21:00'
];

export default function TableBooking() {
  const [searchParams] = useSearchParams();
  const { user, token, isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [restaurantId, setRestaurantId] = useState(searchParams.get('restaurantId') || '1');
  const [restaurants, setRestaurants] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState('19:30');
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);

  // Active lock state
  const [lockedTable, setLockedTable] = useState(null);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(300); // 5 mins in seconds
  const [guestsCount, setGuestsCount] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-Order Food with Table Reservation
  const QUICK_STARTERS = [
    { id: 1, name: 'Paneer Tikka Angaare', price: 320, dietary: 'Veg' },
    { id: 2, name: 'Chicken 65 Chennai Style', price: 340, dietary: 'Non-Veg' },
    { id: 3, name: 'Butter Garlic Naan', price: 90, dietary: 'Veg' },
    { id: 4, name: 'Madras Filter Coffee', price: 90, dietary: 'Veg' }
  ];
  const [preOrderCart, setPreOrderCart] = useState({});

  const updatePreOrder = (id, delta) => {
    setPreOrderCart((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  // Fetch restaurants
  useEffect(() => {
    fetch('/api/admin/restaurants')
      .then((res) => res.json())
      .then((data) => setRestaurants(data.restaurants || []))
      .catch(console.error);
  }, []);

  // Fetch tables with real-time lock and reservation status
  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(
        `/api/tables?restaurantId=${restaurantId}&date=${selectedDate}&timeSlot=${selectedSlot}`,
        { headers }
      );
      const data = await res.json();
      setTables(data.tables || []);
    } catch (err) {
      console.error('Fetch tables error:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, selectedDate, selectedSlot, token]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Real-time Socket.IO listener for live floor updates
  useEffect(() => {
    if (!socket) return;

    const handleTableUpdate = () => {
      fetchTables();
    };

    socket.on('table_locked', handleTableUpdate);
    socket.on('table_unlocked', handleTableUpdate);
    socket.on('table_reserved', handleTableUpdate);
    socket.on('table_status_updated', handleTableUpdate);
    socket.on('reservation_cancelled', handleTableUpdate);
    socket.on('reservation_status_updated', handleTableUpdate);

    return () => {
      socket.off('table_locked', handleTableUpdate);
      socket.off('table_unlocked', handleTableUpdate);
      socket.off('table_reserved', handleTableUpdate);
      socket.off('table_status_updated', handleTableUpdate);
      socket.off('reservation_cancelled', handleTableUpdate);
      socket.off('reservation_status_updated', handleTableUpdate);
    };
  }, [socket, fetchTables]);

  // 5-minute countdown timer when lock is active
  useEffect(() => {
    if (!lockedTable) return;

    const interval = setInterval(() => {
      setLockTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setLockedTable(null);
          setErrorMessage('Your 5-minute table lock expired. Please select the table again.');
          fetchTables();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedTable, fetchTables]);

  // Acquire concurrency lock on table
  const handleSelectTable = async (table) => {
    setErrorMessage('');
    setBookingSuccess(null);

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (table.isReserved) {
      setErrorMessage(`Table ${table.tableNumber} is already booked for ${selectedSlot}.`);
      return;
    }

    if (table.isLocked && !table.lockedByMe) {
      setErrorMessage(`Table ${table.tableNumber} is currently on a 5-minute hold by another customer.`);
      return;
    }

    // Call API to acquire temporary lock
    try {
      const res = await fetch('/api/tables/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tableId: table.id,
          reservationDate: selectedDate,
          timeSlot: selectedSlot
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Could not lock table.');
        fetchTables();
        return;
      }

      setLockedTable(table);
      setLockTimeRemaining(300); // 5 minutes
      setGuestsCount(Math.min(2, table.capacity));
      fetchTables();
    } catch (err) {
      setErrorMessage('Network error acquiring lock.');
    }
  };

  // Release lock manually
  const handleReleaseLock = async () => {
    if (!lockedTable) return;
    try {
      await fetch('/api/tables/release-lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tableId: lockedTable.id,
          reservationDate: selectedDate,
          timeSlot: selectedSlot
        })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLockedTable(null);
      fetchTables();
    }
  };

  // Commit reservation
  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    if (!lockedTable) return;

    try {
      const preOrderList = Object.entries(preOrderCart)
        .filter(([_, qty]) => qty > 0)
        .map(([id, qty]) => {
          const item = QUICK_STARTERS.find(s => s.id === Number(id));
          return `${qty}x ${item?.name || 'Item'}`;
        });
      const combinedRequests = preOrderList.length > 0
        ? `[Pre-Orders: ${preOrderList.join(', ')}] ${specialRequests}`.trim()
        : specialRequests;

      const res = await fetch('/api/tables/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          restaurantId: Number(restaurantId),
          tableId: lockedTable.id,
          reservationDate: selectedDate,
          timeSlot: selectedSlot,
          guestsCount: Number(guestsCount),
          specialRequests: combinedRequests
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to confirm reservation.');
        return;
      }

      setBookingSuccess({ ...data.reservation, preOrders: preOrderList });
      setLockedTable(null);
      setPreOrderCart({});
      fetchTables();
    } catch (err) {
      setErrorMessage('Network error while booking reservation.');
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentSelectedRestaurant = restaurants.find(r => r.id === Number(restaurantId));

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#181920', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
          Reserve a Table
        </h1>
        <p style={{ color: '#5e606d', fontSize: '0.9rem' }}>
          Select your date and dining slot to pick your preferred table from the live floor map
        </p>
      </div>

      {errorMessage && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Digital Boarding-Pass Table Confirmation */}
      {bookingSuccess && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fffdfa 100%)',
            border: '1.5px solid #bbf7d0',
            borderRadius: 16,
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 24px -4px rgba(22, 163, 74, 0.12)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                <CheckCircle2 size={14} /> DINING PASS: CONFIRMED
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#181920', margin: 0 }}>
                {currentSelectedRestaurant?.name || 'Chennai Fine Dining'}
              </h2>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>
                Reservation Token: <strong style={{ color: '#0f172a' }}>FEAST-PASS-#{bookingSuccess.id}</strong>
              </div>
            </div>

            {/* SVG Digital Check-In QR Stamp */}
            <div style={{ textAlign: 'center' }}>
              <svg width="86" height="86" viewBox="0 0 100 100" style={{ background: 'white', padding: 4, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <rect width="100" height="100" fill="white" />
                <rect x="8" y="8" width="26" height="26" fill="#0f172a" rx="4" />
                <rect x="13" y="13" width="16" height="16" fill="white" />
                <rect x="17" y="17" width="8" height="8" fill="#e23744" />
                
                <rect x="66" y="8" width="26" height="26" fill="#0f172a" rx="4" />
                <rect x="71" y="13" width="16" height="16" fill="white" />
                <rect x="75" y="17" width="8" height="8" fill="#e23744" />
                
                <rect x="8" y="66" width="26" height="26" fill="#0f172a" rx="4" />
                <rect x="13" y="71" width="16" height="16" fill="white" />
                <rect x="17" y="75" width="8" height="8" fill="#e23744" />
                
                <rect x="42" y="14" width="8" height="8" fill="#0f172a" />
                <rect x="52" y="14" width="8" height="8" fill="#0f172a" />
                <rect x="42" y="26" width="18" height="8" fill="#0f172a" />
                <rect x="42" y="42" width="8" height="16" fill="#0f172a" />
                <rect x="54" y="44" width="8" height="8" fill="#0f172a" />
                <rect x="14" y="44" width="8" height="8" fill="#0f172a" />
                <rect x="70" y="44" width="18" height="8" fill="#0f172a" />
                <rect x="42" y="68" width="18" height="8" fill="#0f172a" />
                <rect x="68" y="68" width="20" height="20" fill="#0f172a" rx="2" />
                <rect x="73" y="73" width="10" height="10" fill="white" />
              </svg>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 3 }}>Scan at Entrance</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 8 }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>DATE &amp; TIME</span>
              <strong style={{ color: '#0f172a' }}>{bookingSuccess.reservationDate} @ {bookingSuccess.timeSlot}</strong>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 8 }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>RESERVED TABLE</span>
              <strong style={{ color: '#0f172a' }}>Table {bookingSuccess.tableNumber}</strong>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 8 }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>PARTY SIZE</span>
              <strong style={{ color: '#0f172a' }}>{bookingSuccess.guestsCount} Guests</strong>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 8 }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>HOST RESTAURANT</span>
              <strong style={{ color: '#0f172a' }}>{currentSelectedRestaurant?.name || 'Chennai Venue'}</strong>
            </div>
          </div>

          {bookingSuccess.preOrders && bookingSuccess.preOrders.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.65rem 0.85rem', borderRadius: 8, fontSize: '0.825rem', color: '#92400e', marginBottom: '1.25rem' }}>
              🍽️ <strong>Pre-Ordered Starters (Served upon arrival):</strong> {bookingSuccess.preOrders.join(', ')}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `🍽️ Table Reserved at ${currentSelectedRestaurant?.name || 'FeastHub Restaurant'}!\n📅 Date: ${bookingSuccess.reservationDate} at ${bookingSuccess.timeSlot}\n🪑 Table: ${bookingSuccess.tableNumber} (${bookingSuccess.guestsCount} Guests)\n🎫 Reservation Token: FEAST-PASS-#${bookingSuccess.id}\n📍 Chennai`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ background: '#25d366', color: 'white', border: 'none', padding: '0.55rem 1.1rem', fontSize: '0.85rem', fontWeight: 700 }}
            >
              Share Pass on WhatsApp 💬
            </a>
            <button
              onClick={() => navigate('/my-reservations')}
              className="btn btn-outline"
              style={{ fontSize: '0.85rem', fontWeight: 600 }}
            >
              View in My Bookings →
            </button>
          </div>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div className="grid-3" style={{ gap: '1rem' }}>
          <div>
            <label className="form-label">Select Restaurant</label>
            <select
              value={restaurantId}
              onChange={(e) => {
                setRestaurantId(e.target.value);
                setLockedTable(null);
              }}
              className="form-select"
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.address.split(',').slice(-2).join(',').trim()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Reservation Date</label>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setLockedTable(null);
              }}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Time Slot</label>
            <select
              value={selectedSlot}
              onChange={(e) => {
                setSelectedSlot(e.target.value);
                setLockedTable(null);
              }}
              className="form-select"
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: lockedTable ? '2fr 1fr' : '1fr', gap: '1.5rem' }}>
        {/* Interactive Floor Layout */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              Live Floor Layout ({selectedDate} @ {selectedSlot})
            </h2>

            {/* Status Legend */}
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a' }} /> Available
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706' }} /> Locked (Hold)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626' }} /> Reserved
              </span>
            </div>
          </div>

          {loading ? (
            <p style={{ color: '#64748b', padding: '2rem 0', textAlign: 'center' }}>Checking live table grid...</p>
          ) : tables.length === 0 ? (
            <p style={{ color: '#64748b', padding: '2rem 0', textAlign: 'center' }}>No tables found for this restaurant.</p>
          ) : (
            <div className="grid-4" style={{ gap: '1rem' }}>
              {tables.map((t) => {
                const isSelected = lockedTable?.id === t.id;
                let cardBg = 'white';
                let borderColor = '#e2e8f0';
                let statusBadge = <span className="badge badge-success">Available</span>;

                if (t.isReserved) {
                  cardBg = '#fef2f2';
                  borderColor = '#fecaca';
                  statusBadge = <span className="badge badge-danger">Reserved</span>;
                } else if (t.isLocked) {
                  if (t.lockedByMe || isSelected) {
                    cardBg = '#eff6ff';
                    borderColor = '#bfdbfe';
                    statusBadge = <span className="badge badge-primary">Your Hold</span>;
                  } else {
                    cardBg = '#fffbeb';
                    borderColor = '#fde68a';
                    statusBadge = <span className="badge badge-warning">On Hold</span>;
                  }
                }

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTable(t)}
                    style={{
                      backgroundColor: cardBg,
                      borderColor: isSelected ? '#e23744' : borderColor,
                      borderWidth: isSelected ? 2 : 1,
                      borderStyle: 'solid',
                      borderRadius: 12,
                      padding: '1.1rem',
                      boxShadow: isSelected ? '0 4px 14px rgba(226, 55, 68, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                      cursor: t.isReserved || (t.isLocked && !t.lockedByMe) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#181920' }}>
                        {t.tableNumber}
                      </span>
                      {statusBadge}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#5e606d', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.25rem' }}>
                      <Users size={14} /> Capacity: {t.capacity} Guests
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#90929e' }}>
                      Zone: {t.floor_zone}
                    </div>

                    {isSelected && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#e23744', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Lock size={12} /> Held for you: {formatTimer(lockTimeRemaining)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Booking Confirmation Sidebar (Visible when user holds a table) */}
        {lockedTable && (
          <div className="card" style={{ borderColor: '#bfdbfe', background: '#f8fafc', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Complete Booking</h3>
              <div style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700 }}>
                {formatTimer(lockTimeRemaining)}
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.4 }}>
              <strong>Table {lockedTable.tableNumber}</strong> is temporarily held for you. Complete reservation before timer expires to avoid release.
            </div>

            <form onSubmit={handleConfirmReservation}>
              <div className="form-group">
                <label className="form-label">Number of Guests (Max {lockedTable.capacity})</label>
                <input
                  type="number"
                  min="1"
                  max={lockedTable.capacity}
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ marginBottom: 0, fontWeight: 700, fontSize: '0.85rem' }}>
                    🍽️ Pre-Order Starters (Optional)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>Ready on arrival</span>
                </div>
                <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {QUICK_STARTERS.map((starter) => {
                    const qty = preOrderCart[starter.id] || 0;
                    return (
                      <div key={starter.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1f2937' }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: starter.dietary === 'Veg' ? '#16a34a' : '#dc2626', marginRight: 6 }}></span>
                            {starter.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>₹{starter.price}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {qty > 0 && (
                            <button
                              type="button"
                              onClick={() => updatePreOrder(starter.id, -1)}
                              style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              -
                            </button>
                          )}
                          {qty > 0 && <span style={{ fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{qty}</span>}
                          <button
                            type="button"
                            onClick={() => updatePreOrder(starter.id, 1)}
                            style={{
                              padding: qty > 0 ? '0' : '2px 8px',
                              width: qty > 0 ? 22 : 'auto',
                              height: 22,
                              borderRadius: 4,
                              border: '1px solid #e23744',
                              background: qty > 0 ? '#e23744' : '#fff5f5',
                              color: qty > 0 ? '#fff' : '#e23744',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.75rem'
                            }}
                          >
                            {qty > 0 ? '+' : '+ Add'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Special Requests (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Window preference, high chair, birthday decoration"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  <CheckCircle2 size={16} /> Confirm Reservation
                </button>
                <button
                  type="button"
                  onClick={handleReleaseLock}
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', color: '#64748b' }}
                >
                  <Unlock size={14} /> Release Table Hold
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
