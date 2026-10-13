import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  Utensils,
  Radio,
  AlertCircle
} from 'lucide-react';

const STATUS_STEPS = [
  { key: 'Pending', label: 'Order Received' },
  { key: 'Preparing', label: 'In Kitchen Cooking' },
  { key: 'Out for Delivery', label: 'Out for Delivery / Ready' },
  { key: 'Delivered', label: 'Delivered / Completed' }
];

export default function OrderTracking() {
  const { token, user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders/my-orders', {
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
    fetchOrders();
  }, [token]);

  // Real-time status update via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data) => {
      const targetId = Number(data?.orderId || data?.id || data?.order?.id || data?.updatedOrder?.id);
      const newStatus = data?.orderStatus || data?.order?.orderStatus || data?.updatedOrder?.orderStatus;
      const newPaymentStatus = data?.paymentStatus || data?.order?.paymentStatus;

      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id === targetId) {
            return {
              ...ord,
              ...(newStatus ? { orderStatus: newStatus } : {}),
              ...(newPaymentStatus ? { paymentStatus: newPaymentStatus } : {})
            };
          }
          return ord;
        })
      );
    };

    const handleNewOrder = (order) => {
      if (order && (order.customerId === user?.id || !user)) {
        setOrders((prev) => {
          if (prev.some((o) => o.id === order.id)) return prev;
          return [order, ...prev];
        });
      }
    };

    const handlePaymentCompleted = (data) => {
      const targetId = Number(data?.orderId || data?.id);
      setOrders((prev) =>
        prev.map((ord) => (ord.id === targetId ? { ...ord, paymentStatus: 'Success' } : ord))
      );
    };

    socket.on('status_updated', handleStatusUpdate);
    socket.on('order_status_updated', handleStatusUpdate);
    socket.on('order_created', handleNewOrder);
    socket.on('order_status_sync', handleNewOrder);
    socket.on('payment_completed', handlePaymentCompleted);

    return () => {
      socket.off('status_updated', handleStatusUpdate);
      socket.off('order_status_updated', handleStatusUpdate);
      socket.off('order_created', handleNewOrder);
      socket.off('order_status_sync', handleNewOrder);
      socket.off('payment_completed', handlePaymentCompleted);
    };
  }, [socket, user]);

  const getStepIndex = (status) => {
    if (status === 'Cancelled') return -1;
    if (status === 'Served') return 2; // maps to step 2 for Dine-In
    return STATUS_STEPS.findIndex((s) => s.key === status);
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
            Live Order Tracking
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Real-time updates as your meal is prepared, packed, and delivered
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: isConnected ? '#16a34a' : '#d97706', background: isConnected ? '#f0fdf4' : '#fffbeb', padding: '4px 10px', borderRadius: 4, border: '1px solid', borderColor: isConnected ? '#bbf7d0' : '#fde68a' }}>
          <Radio size={14} /> {isConnected ? 'Live Delivery Status Active' : 'Connecting to Live Tracker...'}
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading your orders...</p>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Package size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>No orders placed yet</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Browse our menu and place a dine-in or delivery order.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {orders.map((order) => {
            const currentStepIdx = getStepIndex(order.orderStatus);

            return (
              <div key={order.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Order #{order.id}</span>
                      <span className={`badge ${
                        order.orderStatus === 'Delivered' || order.orderStatus === 'Served' ? 'badge-success' :
                        order.orderStatus === 'Cancelled' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {order.orderStatus}
                      </span>
                      <span className="badge badge-primary">{order.orderType}</span>
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '2px' }}>
                      Restaurant: <strong>{order.restaurantName}</strong> • {new Date(order.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2563eb' }}>₹{order.totalAmount}</div>
                    <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Razorpay Verified</div>
                  </div>
                </div>

                {/* Live Progress Stepper */}
                {order.orderStatus !== 'Cancelled' ? (
                  <div style={{ margin: '1.5rem 0', padding: '0 0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', position: 'relative', gap: '0.5rem' }}>
                      {STATUS_STEPS.map((step, idx) => {
                        const isCompleted = idx <= currentStepIdx;
                        const isCurrent = idx === currentStepIdx;

                        return (
                          <div key={step.key} style={{ textAlign: 'center', position: 'relative' }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: isCompleted ? '#2563eb' : '#e2e8f0',
                                color: isCompleted ? 'white' : '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 0.4rem',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                outline: isCurrent ? '3px solid #bfdbfe' : 'none'
                              }}
                            >
                              {idx + 1}
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#0f172a' : '#64748b' }}>
                              {step.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.6rem 0.75rem', borderRadius: 6, fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={16} /> Order was cancelled.
                  </div>
                )}

                {/* Items in this order */}
                <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, color: '#475569', marginBottom: '0.4rem', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    Items Ordered
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    {order.items?.map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.quantity}x {item.name}</span>
                        <span style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {order.orderType === 'Delivery' && order.deliveryAddress && (
                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
                      <strong>Delivery Address:</strong> {order.deliveryAddress}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
