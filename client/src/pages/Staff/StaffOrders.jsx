import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  ChefHat,
  Clock,
  CheckCircle,
  Truck,
  Utensils,
  ArrowRight,
  Radio
} from 'lucide-react';

export default function StaffOrders() {
  const { token } = useAuth();
  const { socket, isConnected } = useSocket();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playOrderChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Note 2: 880 Hz (A5 bell)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch (err) {
      console.warn('Audio chime unsupported or blocked:', err);
    }
  };

  const fetchKitchenOrders = async () => {
    try {
      const res = await fetch('/api/orders/kitchen', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
  }, [token]);

  // Real-time listener for incoming orders and status changes
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (order) => {
      if (!order || !order.id) return;
      setOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        if (soundEnabled) {
          playOrderChime();
        }
        return [order, ...prev];
      });
    };

    const handleStatusSync = (data) => {
      const targetId = Number(data?.orderId || data?.id || data?.order?.id || data?.updatedOrder?.id);
      const newStatus = data?.orderStatus || data?.order?.orderStatus || data?.updatedOrder?.orderStatus;
      const newPayment = data?.paymentStatus;

      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id === targetId) {
            return {
              ...ord,
              ...(newStatus ? { orderStatus: newStatus } : {}),
              ...(newPayment ? { paymentStatus: newPayment } : {})
            };
          }
          return ord;
        })
      );
    };

    socket.on('order_created', handleNewOrder);
    socket.on('new_kitchen_order', handleNewOrder);
    socket.on('status_updated', handleStatusSync);
    socket.on('order_status_updated', handleStatusSync);
    socket.on('payment_completed', handleStatusSync);

    return () => {
      socket.off('order_created', handleNewOrder);
      socket.off('new_kitchen_order', handleNewOrder);
      socket.off('status_updated', handleStatusSync);
      socket.off('order_status_updated', handleStatusSync);
      socket.off('payment_completed', handleStatusSync);
    };
  }, [socket, soundEnabled]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ orderStatus: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Local update
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, orderStatus: newStatus } : ord))
      );
    } catch (err) {
      alert(err.message || 'Failed to update order status');
    }
  };

  const pendingOrders = orders.filter((o) => o.orderStatus === 'Pending');
  const preparingOrders = orders.filter((o) => o.orderStatus === 'Preparing');
  const activeDeliveryOrders = orders.filter((o) => o.orderStatus === 'Out for Delivery' || o.orderStatus === 'Served');
  const completedOrders = orders.filter((o) => o.orderStatus === 'Delivered');

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            Kitchen Pipeline & Order Kanban (Staff Dashboard)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Manage kitchen cooking workflows and trigger real-time customer status notifications
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playOrderChime();
            }}
            className="btn btn-outline btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              background: soundEnabled ? '#f0fdf4' : '#fff',
              borderColor: soundEnabled ? '#86efac' : '#cbd5e1',
              color: soundEnabled ? '#15803d' : '#64748b'
            }}
          >
            {soundEnabled ? '🔔 Chime: ON' : '🔕 Chime: OFF'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: isConnected ? '#16a34a' : '#d97706', background: isConnected ? '#f0fdf4' : '#fffbeb', padding: '4px 10px', borderRadius: 4, border: '1px solid', borderColor: isConnected ? '#bbf7d0' : '#fde68a' }}>
            <Radio size={14} /> {isConnected ? 'Kitchen Pipeline Live' : 'Connecting to Socket.IO...'}
          </div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading kitchen pipeline...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1.25rem' }}>
          {/* Column 1: Pending */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.6rem 0.85rem', borderRadius: 6, marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#b45309' }}>1. Pending ({pendingOrders.length})</span>
              <Clock size={16} color="#b45309" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pendingOrders.map((ord) => (
                <OrderCard key={ord.id} order={ord} onNext={() => handleUpdateStatus(ord.id, 'Preparing')} nextLabel="Start Cooking" />
              ))}
              {pendingOrders.length === 0 && <EmptyColumn />}
            </div>
          </div>

          {/* Column 2: Preparing */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.6rem 0.85rem', borderRadius: 6, marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1d4ed8' }}>2. In Kitchen ({preparingOrders.length})</span>
              <ChefHat size={16} color="#1d4ed8" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {preparingOrders.map((ord) => (
                <OrderCard
                  key={ord.id}
                  order={ord}
                  onNext={() => handleUpdateStatus(ord.id, ord.orderType === 'Delivery' ? 'Out for Delivery' : 'Served')}
                  nextLabel={ord.orderType === 'Delivery' ? 'Dispatch Delivery' : 'Serve to Table'}
                />
              ))}
              {preparingOrders.length === 0 && <EmptyColumn />}
            </div>
          </div>

          {/* Column 3: Out for Delivery / Served */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '0.6rem 0.85rem', borderRadius: 6, marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#6d28d9' }}>3. In Transit / Served ({activeDeliveryOrders.length})</span>
              <Truck size={16} color="#6d28d9" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeDeliveryOrders.map((ord) => (
                <OrderCard key={ord.id} order={ord} onNext={() => handleUpdateStatus(ord.id, 'Delivered')} nextLabel="Mark Completed" />
              ))}
              {activeDeliveryOrders.length === 0 && <EmptyColumn />}
            </div>
          </div>

          {/* Column 4: Delivered */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.6rem 0.85rem', borderRadius: 6, marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#15803d' }}>4. Completed ({completedOrders.length})</span>
              <CheckCircle size={16} color="#15803d" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {completedOrders.slice(0, 5).map((ord) => (
                <OrderCard key={ord.id} order={ord} isCompleted />
              ))}
              {completedOrders.length === 0 && <EmptyColumn />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onNext, nextLabel, isCompleted }) {
  return (
    <div className="card" style={{ padding: '0.85rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>#{order.id}</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>
            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <span className={`badge ${order.orderType === 'Dine-In' ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
          {order.orderType === 'Dine-In' ? `Table ${order.tableNumber || 'N/A'}` : 'Delivery'}
        </span>
      </div>

      <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.5rem' }}>
        <strong>Customer:</strong> {order.customerName}
      </div>

      <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: 4, fontSize: '0.8rem', marginBottom: '0.75rem' }}>
        {order.items?.map((item) => (
          <div key={item.id} style={{ margin: '4px 0', borderBottom: '1px dashed #e2e8f0', paddingBottom: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>{item.quantity}x {item.name}</span>
              <span style={{ color: '#64748b' }}>₹{item.price * item.quantity}</span>
            </div>
            {item.customization && (
              <div style={{ fontSize: '0.72rem', color: '#e23744', marginTop: '2px' }}>
                {item.customization.spiceLevel && <span>🌶️ {item.customization.spiceLevel} </span>}
                {item.customization.addon && <span>• +{item.customization.addon.name} </span>}
                {item.customization.notes && <span>• 📝 {item.customization.notes}</span>}
              </div>
            )}
          </div>
        ))}
        <div style={{ marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
          <span>Total:</span>
          <span>₹{order.totalAmount}</span>
        </div>
      </div>

      {!isCompleted && onNext && (
        <button
          onClick={onNext}
          className="btn btn-primary btn-sm"
          style={{ width: '100%', fontSize: '0.8rem' }}
        >
          {nextLabel} <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}

function EmptyColumn() {
  return (
    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8', fontSize: '0.8rem', border: '1px dashed #cbd5e1', borderRadius: 6 }}>
      No orders in this stage
    </div>
  );
}
