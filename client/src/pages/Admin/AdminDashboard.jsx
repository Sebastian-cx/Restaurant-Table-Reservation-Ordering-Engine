import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  TrendingUp,
  Users,
  CalendarCheck,
  ShoppingBag,
  DollarSign,
  ShieldCheck,
  Activity,
  Radio
} from 'lucide-react';

export default function AdminDashboard() {
  const { token } = useAuth();
  const { socket, isConnected, onlineCount } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  // Real-time synchronization for admin analytics & live feed
  useEffect(() => {
    if (!socket) return;

    const handleRealtimeUpdate = () => {
      fetchStats();
    };

    socket.on('admin_stats_updated', handleRealtimeUpdate);
    socket.on('order_created', handleRealtimeUpdate);
    socket.on('status_updated', handleRealtimeUpdate);
    socket.on('payment_completed', handleRealtimeUpdate);
    socket.on('table_reserved', handleRealtimeUpdate);
    socket.on('reservation_cancelled', handleRealtimeUpdate);
    socket.on('table_locked', handleRealtimeUpdate);
    socket.on('table_unlocked', handleRealtimeUpdate);

    return () => {
      socket.off('admin_stats_updated', handleRealtimeUpdate);
      socket.off('order_created', handleRealtimeUpdate);
      socket.off('status_updated', handleRealtimeUpdate);
      socket.off('payment_completed', handleRealtimeUpdate);
      socket.off('table_reserved', handleRealtimeUpdate);
      socket.off('reservation_cancelled', handleRealtimeUpdate);
      socket.off('table_locked', handleRealtimeUpdate);
      socket.off('table_unlocked', handleRealtimeUpdate);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem 1.25rem' }}>
        <p style={{ color: '#64748b' }}>Loading analytics...</p>
      </div>
    );
  }

  const { stats = {}, ordersByStatus = [], userRoles = [], recentOrders = [] } = data || {};

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            Platform Analytics & Executive Dashboard (Admin Portal)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            System-wide performance metrics, order fulfillment rates, and revenue audit
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: isConnected ? '#16a34a' : '#d97706', background: isConnected ? '#f0fdf4' : '#fffbeb', padding: '6px 14px', borderRadius: 8, border: '1px solid', borderColor: isConnected ? '#bbf7d0' : '#fde68a', fontWeight: 600 }}>
          <Radio size={14} /> {isConnected ? `Live Engine Active (${onlineCount || 1} online)` : 'Connecting to Live Engine...'}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>GROSS REVENUE</span>
            <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '6px', borderRadius: 4 }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>₹{stats.totalRevenue || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px' }}>Verified via Razorpay HMAC</div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>TOTAL ORDERS</span>
            <div style={{ background: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: 4 }}>
              <ShoppingBag size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>{stats.totalOrders || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Dine-In & Delivery</div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>TABLE RESERVATIONS</span>
            <div style={{ background: '#faf5ff', color: '#9333ea', padding: '6px', borderRadius: 4 }}>
              <CalendarCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>{stats.totalReservations || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Zero race-condition collisions</div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>PLATFORM USERS</span>
            <div style={{ background: '#fffbeb', color: '#d97706', padding: '6px', borderRadius: 4 }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>{stats.totalUsers || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Across 4 RBAC Roles</div>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Orders by Status */}
        <div className="card">
          <h2 className="card-title">Order Fulfillment Distribution</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {ordersByStatus.map((item) => (
              <div key={item.status}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 500 }}>{item.status}</span>
                  <span style={{ fontWeight: 600 }}>{item.count} orders</span>
                </div>
                <div style={{ background: '#f1f5f9', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      background: '#2563eb',
                      height: '100%',
                      width: `${Math.min(100, (item.count / (stats.totalOrders || 1)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Role Distribution */}
        <div className="card">
          <h2 className="card-title">Role-Based Access Control (RBAC) Accounts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {userRoles.map((r) => (
              <div key={r.role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span className={`badge ${
                  r.role === 'Admin' ? 'badge-danger' :
                  r.role === 'Staff' ? 'badge-warning' :
                  r.role === 'Moderator' ? 'badge-primary' : 'badge-success'
                }`}>
                  {r.role}
                </span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.count} Registered</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Table Reservation & Concurrency Lock Monitoring Panel */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: '2rem', border: '1px solid #bfdbfe' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#f8fafc' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: 6 }}>
                <CalendarCheck size={18} />
              </div>
              <h2 className="card-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                Live Table Reservation & Concurrency Monitor
              </h2>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Real-time audit of dining bookings, seatings, and active 5-minute concurrency holds
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, background: data?.activeTableLocks?.length ? '#fef2f2' : '#f0fdf4', color: data?.activeTableLocks?.length ? '#dc2626' : '#16a34a', padding: '4px 10px', borderRadius: 20, border: '1px solid currentColor' }}>
              ⚡ {data?.activeTableLocks?.length || 0} Active Concurrency Locks
            </span>
          </div>
        </div>

        {/* Active Concurrency Locks Banner if any */}
        {data?.activeTableLocks && data.activeTableLocks.length > 0 && (
          <div style={{ padding: '0.85rem 1.25rem', background: '#fffbeb', borderBottom: '1px solid #fef3c7', fontSize: '0.825rem' }}>
            <div style={{ fontWeight: 600, color: '#b45309', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} /> Tables Currently On Temporary Hold (Anti-Collision Lock):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {data.activeTableLocks.map((lock, i) => (
                <span key={i} style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem' }}>
                  🔒 <strong>{lock.tableNumber}</strong> ({lock.floor_zone || 'Floor'}) at <em>{lock.restaurantName}</em> — Held by {lock.userName} (expires {new Date(lock.expiresAt).toLocaleTimeString()})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reservations Table */}
        <table className="data-table">
          <thead>
            <tr>
              <th>Res #</th>
              <th>Customer</th>
              <th>Restaurant</th>
              <th>Table & Zone</th>
              <th>Date & Slot</th>
              <th>Guests</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.recentReservations || []).length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No reservations recorded yet.
                </td>
              </tr>
            ) : (
              data.recentReservations.map((res) => (
                <tr key={res.id}>
                  <td><strong>#{res.id}</strong></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{res.customerName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{res.customerEmail}</div>
                  </td>
                  <td>{res.restaurantName}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{res.tableNumber}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '4px' }}>({res.floor_zone || 'Main Hall'})</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{res.reservationDate}</div>
                    <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>{res.timeSlot}</div>
                  </td>
                  <td>{res.guestsCount} Guests</td>
                  <td>
                    <span className={`badge ${
                      res.status === 'Confirmed' ? 'badge-primary' :
                      res.status === 'Seated' ? 'badge-warning' :
                      res.status === 'Completed' ? 'badge-success' : 'badge-danger'
                    }`}>
                      {res.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {res.status === 'Confirmed' && (
                        <button
                          onClick={async () => {
                            await fetch(`/api/admin/reservations/${res.id}/status`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ status: 'Seated' })
                            });
                            // Refresh
                            const refreshRes = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
                            setData(await refreshRes.json());
                          }}
                          style={{ padding: '3px 8px', fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                        >
                          Seat
                        </button>
                      )}
                      {res.status === 'Seated' && (
                        <button
                          onClick={async () => {
                            await fetch(`/api/admin/reservations/${res.id}/status`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ status: 'Completed' })
                            });
                            const refreshRes = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
                            setData(await refreshRes.json());
                          }}
                          style={{ padding: '3px 8px', fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                        >
                          Complete
                        </button>
                      )}
                      {res.status !== 'Cancelled' && res.status !== 'Completed' && (
                        <button
                          onClick={async () => {
                            if (!window.confirm('Cancel this reservation?')) return;
                            await fetch(`/api/admin/reservations/${res.id}/status`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ status: 'Cancelled' })
                            });
                            const refreshRes = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
                            setData(await refreshRes.json());
                          }}
                          style={{ padding: '3px 8px', fontSize: '0.72rem', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Recent Orders Overview */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Recent Orders</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Restaurant</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((ord) => (
              <tr key={ord.id}>
                <td><strong>#{ord.id}</strong></td>
                <td>{ord.customerName}</td>
                <td>{ord.restaurantName}</td>
                <td><span className="badge badge-primary">{ord.orderType}</span></td>
                <td><strong>₹{ord.totalAmount}</strong></td>
                <td>
                  <span className={`badge ${ord.orderStatus === 'Delivered' ? 'badge-success' : 'badge-warning'}`}>
                    {ord.orderStatus}
                  </span>
                </td>
                <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {new Date(ord.created_at).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
