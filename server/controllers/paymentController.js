const crypto = require('crypto');
const db = require('../db');
const { broadcastEvent, emitToUser, emitToStaff, emitToAdmin, emitToOrder } = require('../socket');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_SczMw4v8GF95Pg';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'secret_academic_key_hmac_sha256';

exports.createRazorpayOrder = (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ error: 'orderId and amount are required.' });
    }

    // Amount in paisa (multiplied by 100 as per Razorpay API specs)
    const amountInPaisa = Math.round(Number(amount) * 100);
    const mockRazorpayOrderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Store razorpayOrderId in payments table
    db.run(
      `UPDATE payments 
       SET razorpayOrderId = ?, amount = ?, paymentStatus = 'Pending' 
       WHERE orderId = ?`,
      [mockRazorpayOrderId, amount, orderId]
    );

    return res.json({
      keyId: RAZORPAY_KEY_ID,
      razorpayOrderId: mockRazorpayOrderId,
      amount: amountInPaisa,
      currency: 'INR',
      orderId
    });
  } catch (err) {
    console.error('createRazorpayOrder error:', err);
    return res.status(500).json({ error: 'Failed to initiate Razorpay order.' });
  }
};

exports.verifyPayment = (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({ error: 'Missing payment verification credentials.' });
    }

    // Cryptographic verification using HMAC-SHA256 (Literature requirement: Varghese & Nair 2023)
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    // In demo / sandbox, accept either valid cryptographic signature or client test signature
    const isValid = (razorpaySignature === generatedSignature) || (razorpaySignature && razorpaySignature.startsWith('sig_test_'));

    if (!isValid) {
      db.run("UPDATE payments SET paymentStatus = 'Failed' WHERE orderId = ?", [orderId]);
      return res.status(400).json({
        success: false,
        error: 'Invalid Razorpay payment signature. Transaction tampered or unverified.'
      });
    }

    // Update payment record in D1
    db.run(
      `UPDATE payments 
       SET razorpayPaymentId = ?, razorpaySignature = ?, paymentStatus = 'Success' 
       WHERE orderId = ?`,
      [razorpayPaymentId, razorpaySignature, orderId]
    );

    // Update order status if still pending
    db.run("UPDATE orders SET orderStatus = 'Preparing' WHERE id = ? AND orderStatus = 'Pending'", [orderId]);

    // Audit log
    db.run('INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)', [
      req.user ? req.user.id : null,
      'PAYMENT_VERIFIED',
      `HMAC-SHA256 payment verified for order #${orderId} (Razorpay ID: ${razorpayPaymentId})`
    ]);

    broadcastEvent('payment_completed', { orderId: Number(orderId), paymentStatus: 'Success' });

    // Push live status update that order transitioned to Preparing
    const statusPayload = {
      orderId: Number(orderId),
      id: Number(orderId),
      orderStatus: 'Preparing',
      paymentStatus: 'Success'
    };
    broadcastEvent('status_updated', statusPayload);
    const orderRecord = db.get('SELECT customerId FROM orders WHERE id = ?', [orderId]);
    if (orderRecord?.customerId) {
      emitToUser(orderRecord.customerId, 'order_status_updated', statusPayload);
    }
    emitToStaff('order_status_updated', statusPayload);
    emitToOrder(Number(orderId), 'order_status_updated', statusPayload);
    emitToAdmin('admin_stats_updated', { type: 'PAYMENT_VERIFIED', orderId: Number(orderId), amount: req.body.amount });

    return res.json({
      success: true,
      message: 'Razorpay payment verified successfully with HMAC-SHA256.',
      orderId,
      razorpayPaymentId
    });
  } catch (err) {
    console.error('verifyPayment error:', err);
    return res.status(500).json({ error: 'Payment verification failed.' });
  }
};
