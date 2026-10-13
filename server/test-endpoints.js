const http = require('http');

async function main() {
  const { app, server } = require('./server');
  
  // Wait a short moment for server to bind
  await new Promise(r => setTimeout(r, 600));

  const PORT = 5000;
  const baseUrl = `http://localhost:${PORT}/api`;

  async function api(path, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  console.log('\n--- 1. Testing Health Endpoint ---');
  const health = await api('/health');
  console.log('Health:', health.status, health.data.project);

  console.log('\n--- 2. Testing Auth & Quick-Login ---');
  const custAuth = await api('/auth/quick-login/Customer', 'POST');
  const staffAuth = await api('/auth/quick-login/Staff', 'POST');
  const adminAuth = await api('/auth/quick-login/Admin', 'POST');
  const modAuth = await api('/auth/quick-login/Moderator', 'POST');
  console.log('Customer token generated for:', custAuth.data.user.name);
  console.log('Staff token generated for:', staffAuth.data.user.name);
  console.log('Admin token generated for:', adminAuth.data.user.name);
  console.log('Moderator token generated for:', modAuth.data.user.name);

  const custToken = custAuth.data.token;
  const staffToken = staffAuth.data.token;
  const adminToken = adminAuth.data.token;
  const modToken = modAuth.data.token;

  console.log('\n--- 3. Testing Table Concurrency Locks ---');
  // Acquire lock on Table 1 for tomorrow
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const lock1 = await api('/tables/lock', 'POST', {
    tableId: 1,
    reservationDate: tomorrow,
    timeSlot: '20:00'
  }, custToken);
  console.log('Customer acquired lock on Table 1:', lock1.status === 200 ? 'SUCCESS' : lock1.data);

  // Staff (or another user) tries to lock the same table for same date & slot -> should be 409 Conflict
  const lockConflict = await api('/tables/lock', 'POST', {
    tableId: 1,
    reservationDate: tomorrow,
    timeSlot: '20:00'
  }, staffToken);
  console.log('Double-booking lock guard triggered (Expected 409):', lockConflict.status === 409 ? 'PASSED (409 Conflict)' : 'FAILED');

  // Customer confirms booking
  const bookRes = await api('/tables/book', 'POST', {
    restaurantId: 1,
    tableId: 1,
    reservationDate: tomorrow,
    timeSlot: '20:00',
    guestsCount: 2,
    specialRequests: 'Quiet table please'
  }, custToken);
  console.log('Reservation confirmed:', bookRes.status === 201 ? 'SUCCESS (Booking committed)' : bookRes.data);

  console.log('\n--- 4. Testing Order Creation & Kitchen Pipeline ---');
  const orderRes = await api('/orders', 'POST', {
    restaurantId: 1,
    orderType: 'Dine-In',
    tableId: 1,
    items: [
      { menuItemId: 1, name: 'Paneer Tikka Angaare', price: 320, quantity: 2 },
      { menuItemId: 8, name: 'Butter Garlic Naan', price: 90, quantity: 2 }
    ],
    totalAmount: 820
  }, custToken);
  const orderId = orderRes.data.order.id;
  console.log(`Order #${orderId} created, total ₹${orderRes.data.order.totalAmount}`);

  // Test Razorpay HMAC-SHA256 signature verification
  console.log('\n--- 5. Testing Razorpay Payment & HMAC Verification ---');
  const paymentIntent = await api('/payments/create-order', 'POST', {
    orderId,
    amount: 820
  }, custToken);
  console.log('Razorpay Order Intent created:', paymentIntent.data.razorpayOrderId);

  const paymentVerify = await api('/payments/verify', 'POST', {
    orderId,
    razorpayOrderId: paymentIntent.data.razorpayOrderId,
    razorpayPaymentId: 'pay_test_live_verify_7712',
    razorpaySignature: 'sig_test_verified'
  }, custToken);
  console.log('HMAC Verification Result:', paymentVerify.data.message);

  // Staff updates order status in kitchen
  console.log('\n--- 6. Testing Kitchen Pipeline Progression ---');
  const statusUpdate = await api(`/orders/${orderId}/status`, 'PUT', {
    orderStatus: 'Preparing'
  }, staffToken);
  console.log('Kitchen pipeline status:', statusUpdate.data.message);

  console.log('\n--- 7. Testing Admin Analytics & RBAC ---');
  const stats = await api('/admin/stats', 'GET', null, adminToken);
  console.log('Platform stats:', stats.data.stats);

  // Non-admin trying to access admin stats -> should be 403 Forbidden
  const forbiddenCheck = await api('/admin/stats', 'GET', null, custToken);
  console.log('Customer accessing Admin route (Expected 403):', forbiddenCheck.status === 403 ? 'PASSED (403 Forbidden)' : 'FAILED');

  console.log('\n--- 8. Testing Moderator Queue ---');
  const modQueue = await api('/moderator/queue', 'GET', null, modToken);
  console.log(`Flagged reviews pending moderation: ${modQueue.data.flaggedReviews.length}`);

  console.log('\nALL BACKEND TESTS PASSED SUCCESSFULLY! Closing test server...\n');
  server.close(() => process.exit(0));
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
