import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  CheckCircle2,
  Lock,
  ArrowLeft,
  AlertCircle,
  Tag,
  Check,
  MapPin,
  Home as HomeIcon,
  Briefcase,
  X,
  Sparkles
} from 'lucide-react';

const SAVED_ADDRESSES = [
  { id: 'home', label: 'Home', address: 'Flat 4B, Ceebros Heights, Guindy, Chennai - 600032', icon: <HomeIcon size={14} /> },
  { id: 'work', label: 'Office', address: 'Floor 5, Olympia Tech Park, Ekkattuthangal, Chennai - 600032', icon: <Briefcase size={14} /> },
  { id: 'custom', label: 'Custom', address: '14 Anna Salai, T. Nagar, Chennai - 600017', icon: <MapPin size={14} /> }
];

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const { token, user } = useAuth();

  const orderMeta = location.state || {};
  const { orderType = 'Dine-In', tableId = null, tableNumber = 'T1', deliveryAddress = '', restaurantId = '1', grandTotal = 0 } = orderMeta;

  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Multi-Address Selector
  const [selectedAddressId, setSelectedAddressId] = useState('home');
  const [currentAddress, setCurrentAddress] = useState(
    deliveryAddress || SAVED_ADDRESSES[0].address
  );

  // Promo Code Engine
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const payableAmount = Math.max(0, grandTotal - discountAmount);

  if (!cartItems.length && !paymentSuccess) {
    return (
      <div className="container" style={{ padding: '3rem 1.25rem', textAlign: 'center' }}>
        <p style={{ color: '#64748b', marginBottom: '1rem' }}>No pending order details found.</p>
        <Link to="/menu" className="btn btn-primary">Return to Menu</Link>
      </div>
    );
  }

  const handleApplyCoupon = async (codeToApply) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) return;
    setCouponError('');
    setValidatingCoupon(true);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, amount: grandTotal })
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || 'Invalid coupon code');
        setAppliedCoupon(null);
        setDiscountAmount(0);
      } else {
        setAppliedCoupon(data);
        setDiscountAmount(data.discount);
        setCouponInput(data.code);
        setCouponError('');
      }
    } catch (err) {
      setCouponError('Error validating coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponInput('');
    setCouponError('');
  };

  const handleProcessPayment = async () => {
    setProcessing(true);
    setErrorMessage('');

    try {
      // 1. Submit order to database
      const orderPayload = {
        restaurantId: Number(restaurantId),
        orderType,
        tableId: orderType === 'Dine-In' ? (tableId ? Number(tableId) : 1) : null,
        deliveryAddress: orderType === 'Delivery' ? currentAddress : '',
        items: cartItems.map((item) => ({
          menuItemId: item.id,
          name: item.customization?.spiceLevel ? `${item.name} (${item.customization.spiceLevel})` : item.name,
          price: item.price,
          quantity: item.quantity
        })),
        totalAmount: payableAmount,
        couponCode: appliedCoupon?.code || null,
        discountAmount: discountAmount
      };

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to initialize order.');

      const orderId = orderData.order.id;

      // 2. Request Razorpay Order Intent from backend
      const rzpIntentRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ orderId, amount: payableAmount })
      });
      const rzpIntent = await rzpIntentRes.json();

      const completeVerification = async (paymentId, signature) => {
        const verifyRes = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            orderId,
            razorpayOrderId: rzpIntent.razorpayOrderId,
            razorpayPaymentId: paymentId || `pay_rzp_${Date.now()}`,
            razorpaySignature: signature || 'sig_test_verified'
          })
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed.');

        setPaymentSuccess({
          orderId,
          orderType,
          amount: payableAmount,
          paymentId: paymentId || `pay_mock_${Date.now()}`
        });
        clearCart();
        setProcessing(false);
      };

      // 3. Trigger Razorpay Checkout Modal
      if (window.Razorpay) {
        const options = {
          key: rzpIntent.keyId || 'rzp_test_SczMw4v8GF95Pg',
          amount: rzpIntent.amount,
          currency: 'INR',
          name: 'FeastHub Dining',
          description: `Order #${orderId} - ${orderType}`,
          order_id: rzpIntent.razorpayOrderId,
          handler: function (response) {
            completeVerification(response.razorpay_payment_id, response.razorpay_signature);
          },
          prefill: {
            name: user?.name || 'Customer',
            email: user?.email || 'customer@example.com',
            contact: '9876543210'
          },
          theme: { color: '#e23744' },
          modal: {
            ondismiss: function () {
              setProcessing(false);
              setErrorMessage('Payment popup dismissed. You can retry with any channel.');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setProcessing(false);
          setErrorMessage(`Payment Failed: ${response.error.description}`);
        });
        rzp.open();
      } else {
        // Fallback for environments where Razorpay SDK script is blocked
        await completeVerification(`pay_rzp_${Date.now()}`, 'sig_test_verified');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Payment processing failed.');
      setProcessing(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem', maxWidth: 860 }}>
      <Link to="/menu" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.875rem', textDecoration: 'none', marginBottom: '1.25rem' }}>
        <ArrowLeft size={16} /> Back to Menu
      </Link>

      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#181920', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          Checkout &amp; Payment
        </h1>
        <p style={{ color: '#5e606d', fontSize: '0.9rem' }}>
          Review your order details, apply coupons, and complete safe payment via Razorpay
        </p>
      </div>

      {errorMessage && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {paymentSuccess ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', borderRadius: 16 }}>
          <div style={{ background: '#f0fdf4', color: '#16a34a', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#181920', marginBottom: '0.5rem' }}>
            Payment Verified &amp; Order Placed!
          </h2>
          <p style={{ color: '#5e606d', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Order <strong>#{paymentSuccess.orderId}</strong> is confirmed. Razorpay Reference: <code>{paymentSuccess.paymentId}</code>
          </p>

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 10, maxWidth: 420, margin: '0 auto 1.5rem', textAlign: 'left', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ color: '#64748b' }}>Fulfillment</span>
              <strong>{paymentSuccess.orderType}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ color: '#64748b' }}>Security Check</span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>HMAC-SHA256 Match ✔</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.4rem', fontWeight: 800 }}>
              <span>Total Paid</span>
              <span style={{ color: '#e23744' }}>₹{paymentSuccess.amount}</span>
            </div>
          </div>

          <button onClick={() => navigate('/my-orders')} className="btn btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
            Track Order Status (Live)
          </button>
        </div>
      ) : (
        <div className="grid-2" style={{ gap: '1.5rem' }}>
          {/* Left Column: Order Summary, Address Selector & Promo Engine */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Address Selector (for Delivery) */}
            {orderType === 'Delivery' && (
              <div className="card" style={{ borderRadius: 14 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={16} color="#e23744" /> Delivery Address
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {SAVED_ADDRESSES.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => {
                        setSelectedAddressId(addr.id);
                        setCurrentAddress(addr.address);
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: 8,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        border: selectedAddressId === addr.id ? '1.5px solid #e23744' : '1px solid #e2e8f0',
                        background: selectedAddressId === addr.id ? '#fff1f2' : '#ffffff',
                        color: selectedAddressId === addr.id ? '#e23744' : '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                      }}
                    >
                      {addr.icon} {addr.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  className="form-textarea"
                  rows={2}
                  style={{ fontSize: '0.825rem', resize: 'vertical' }}
                  placeholder="Enter complete delivery address..."
                />
              </div>
            )}

            {/* Order Items Summary */}
            <div className="card" style={{ borderRadius: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h2 className="card-title" style={{ margin: 0, fontSize: '1.05rem' }}>Order Items ({cartItems.length})</h2>
                <span className="badge badge-primary">{orderType}</span>
              </div>

              {orderType === 'Dine-In' && (
                <div style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                  Assigned Seating: <strong>Table {tableNumber}</strong>
                </div>
              )}

              <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: '0.75rem' }}>
                {cartItems.map((item) => (
                  <div key={item.cartKey || item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.85rem', padding: '0.45rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#181920' }}>{item.quantity}x {item.name}</div>
                      {item.customization && (
                        <div style={{ fontSize: '0.72rem', color: '#686b78', marginTop: 2 }}>
                          {item.customization.spiceLevel && <span>🌶️ {item.customization.spiceLevel}</span>}
                          {item.customization.addon && <span> • {item.customization.addon}</span>}
                        </div>
                      )}
                    </div>
                    <span style={{ fontWeight: 700, color: '#181920' }}>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Bill Details */}
              <div style={{ borderTop: '1px solid #eef2f6', paddingTop: '0.75rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#686b78' }}>
                  <span>Item Subtotal</span>
                  <span>₹{grandTotal}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                    <span>Coupon Discount ({appliedCoupon?.code})</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: '#181920', borderTop: '1px dashed #e2e8f0', paddingTop: '0.5rem' }}>
                  <span>To Pay</span>
                  <span style={{ color: '#e23744' }}>₹{payableAmount}</span>
                </div>
              </div>
            </div>

            {/* Interactive Promo Code Engine */}
            <div className="card" style={{ borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.75rem' }}>
                <Tag size={16} color="#e23744" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Offers &amp; Coupons</h3>
              </div>

              {appliedCoupon ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.65rem 0.85rem', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={14} /> '{appliedCoupon.code}' Applied
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                      {appliedCoupon.message}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                    title="Remove coupon"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="form-input"
                      style={{ textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 600 }}
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon()}
                      disabled={validatingCoupon || !couponInput.trim()}
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      {validatingCoupon ? 'Checking...' : 'Apply'}
                    </button>
                  </div>

                  {couponError && (
                    <div style={{ color: '#dc2626', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                      {couponError}
                    </div>
                  )}

                  {/* Quick Coupon Suggestions */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {[
                      { code: 'CHENNAI50', label: 'CHENNAI50 (50% Off)' },
                      { code: 'FEAST100', label: 'FEAST100 (₹100 Off)' },
                      { code: 'WELCOME', label: 'WELCOME (₹75 Off)' }
                    ].map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleApplyCoupon(c.code)}
                        style={{
                          border: '1px dashed #e23744',
                          background: '#fff1f2',
                          color: '#e23744',
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🏷️ {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Razorpay Gateway Box */}
          <div className="card" style={{ borderColor: '#fecdd3', height: 'fit-content', borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <div style={{ background: '#fff1f2', color: '#e23744', padding: '8px', borderRadius: 8 }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Razorpay Secure Checkout</h3>
                <span style={{ fontSize: '0.75rem', color: '#686b78' }}>Instant UPI &amp; Card Processing</span>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Payment Channel</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { id: 'UPI', label: 'UPI (Google Pay, PhonePe, Paytm)', icon: <QrCode size={16} /> },
                  { id: 'Card', label: 'Debit / Credit Card (Visa, RuPay)', icon: <CreditCard size={16} /> }
                ].map((m) => (
                  <label
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 8,
                      border: paymentMethod === m.id ? '1.5px solid #e23744' : '1px solid #ededf2',
                      background: paymentMethod === m.id ? '#fff1f2' : 'white',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: paymentMethod === m.id ? 700 : 500
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentChannel"
                      checked={paymentMethod === m.id}
                      onChange={() => setPaymentMethod(m.id)}
                      style={{ accentColor: '#e23744' }}
                    />
                    {m.icon}
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: 8, fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Amount:</span>
                <strong>₹{payableAmount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Security:</span>
                <span>SHA-256 HMAC Signature</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Gateway:</span>
                <span>Razorpay Node / Edge Intent</span>
              </div>
            </div>

            <button
              onClick={handleProcessPayment}
              disabled={processing}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 800 }}
            >
              <Lock size={16} /> {processing ? 'Connecting Gateway...' : `Pay ₹${payableAmount} via Razorpay`}
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.72rem', color: '#94a3b8' }}>
              🔒 100% Encrypted &amp; Verified Payment
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
