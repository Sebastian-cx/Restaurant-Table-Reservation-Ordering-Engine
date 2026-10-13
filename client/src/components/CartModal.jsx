import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { X, Trash2, Plus, Minus, ArrowRight, Utensils, Truck } from 'lucide-react';

export default function CartModal({ isOpen, onClose }) {
  const { cartItems, updateQuantity, removeFromCart, clearCart, cartTotal, selectedRestaurantId } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [orderType, setOrderType] = useState('Dine-In');
  const [tableNumber, setTableNumber] = useState('T1');
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [restaurantTables, setRestaurantTables] = useState([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (selectedRestaurantId && isOpen) {
      fetch(`/api/tables?restaurantId=${selectedRestaurantId}`)
        .then((res) => res.json())
        .then((data) => {
          const tbls = data.tables || [];
          setRestaurantTables(tbls);
          if (tbls.length > 0) {
            setSelectedTableId(tbls[0].id);
            setTableNumber(tbls[0].tableNumber);
          }
        })
        .catch(console.error);
    }
  }, [selectedRestaurantId, isOpen]);

  if (!isOpen) return null;

  const gst = Math.round(cartTotal * 0.05);
  const grandTotal = cartTotal + gst;

  const handleProceedToCheckout = () => {
    setErrorMsg('');
    if (cartItems.length === 0) {
      setErrorMsg('Your cart is empty.');
      return;
    }

    if (orderType === 'Delivery' && !deliveryAddress.trim()) {
      setErrorMsg('Please enter a delivery address.');
      return;
    }

    if (!isAuthenticated) {
      onClose();
      navigate('/login');
      return;
    }

    onClose();
    navigate('/checkout', {
      state: {
        orderType,
        tableId: orderType === 'Dine-In' ? selectedTableId : null,
        tableNumber: orderType === 'Dine-In' ? tableNumber : null,
        deliveryAddress: orderType === 'Delivery' ? deliveryAddress : null,
        restaurantId: selectedRestaurantId,
        grandTotal
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Your Order Cart</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.6rem', borderRadius: 6, fontSize: '0.85rem', marginBottom: '1rem' }}>
            {errorMsg}
          </div>
        )}

        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>
            <Utensils size={40} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <p>Your cart is empty.</p>
          </div>
        ) : (
          <div>
            {/* Cart Items List */}
            <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {cartItems.map((item) => (
                <div
                  key={item.cartKey || item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0',
                    borderBottom: '1px solid #f1f5f9'
                  }}
                >
                  <div style={{ flex: 1, paddingRight: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#181920' }}>{item.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>₹{item.price} each</div>
                    {item.customization && (
                      <div style={{ fontSize: '0.74rem', color: '#e23744', marginTop: 2, fontWeight: 500 }}>
                        {item.customization.spiceLevel && <span>🌶️ {item.customization.spiceLevel}</span>}
                        {item.customization.addon && <span> • {item.customization.addon}</span>}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => updateQuantity(item.cartKey || item.id, -1)}
                      className="btn btn-outline btn-sm"
                      style={{ padding: '2px 6px' }}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', minWidth: 20, textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.cartKey || item.id, 1)}
                      className="btn btn-outline btn-sm"
                      style={{ padding: '2px 6px' }}
                    >
                      <Plus size={12} />
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', width: 60, textAlign: 'right', color: '#181920' }}>
                      ₹{item.price * item.quantity}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.cartKey || item.id)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Fulfillment Selection */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Order Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setOrderType('Dine-In')}
                  className={`btn ${orderType === 'Dine-In' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.85rem' }}
                >
                  <Utensils size={15} /> Dine-In
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('Delivery')}
                  className={`btn ${orderType === 'Delivery' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.85rem' }}
                >
                  <Truck size={15} /> Delivery
                </button>
              </div>
            </div>

            {orderType === 'Dine-In' ? (
              <div className="form-group">
                <label className="form-label">Select Seating Table</label>
                <select
                  value={selectedTableId || ''}
                  onChange={(e) => {
                    const tId = Number(e.target.value);
                    setSelectedTableId(tId);
                    const found = restaurantTables.find((t) => t.id === tId);
                    if (found) setTableNumber(found.tableNumber);
                  }}
                  className="form-select"
                >
                  {restaurantTables.length > 0 ? (
                    restaurantTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tableNumber} — {t.floor_zone} ({t.capacity} Seater)
                      </option>
                    ))
                  ) : (
                    <option value="1">Table T1 (Dine-In Area)</option>
                  )}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Delivery Address</label>
                <textarea
                  rows={2}
                  placeholder="Enter flat / house #, street, landmark, pincode"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="form-textarea"
                />
              </div>
            )}

            {/* Price Breakdown */}
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#64748b' }}>Item Total</span>
                <span>₹{cartTotal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#64748b' }}>Taxes & GST (5%)</span>
                <span>₹{gst}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.4rem' }}>
                <span>To Pay</span>
                <span style={{ color: '#2563eb' }}>₹{grandTotal}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={clearCart} className="btn btn-outline" style={{ fontSize: '0.8rem' }}>
                Clear Cart
              </button>
              <button
                onClick={handleProceedToCheckout}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Proceed to Checkout <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
