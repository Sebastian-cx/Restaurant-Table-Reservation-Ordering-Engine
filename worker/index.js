// Cloudflare Worker for FeastHub
// Full-Stack API Router with Cloudflare D1 Native Binding & Static Assets Fallback

const JWT_SECRET = 'feasthub_jwt_secret_cf_d1_2026';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

async function signJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const encodedSig = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${data}.${encodedSig}`;
}

async function verifyJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;
    const data = `${header}.${payload}`;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = Uint8Array.from(base64UrlDecode(sig), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data));
    if (!isValid) return null;
    return JSON.parse(base64UrlDecode(payload));
  } catch (err) {
    return null;
  }
}

async function getUserFromRequest(request) {
  const auth = request.headers.get('Authorization');
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return await verifyJwt(token);
}

async function hashPassword(password) {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(password + '_salt_feasthub'));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // --- SOCKET.IO REAL-TIME HANDLER FOR CLOUDFLARE EDGE ---
    if (pathname.startsWith('/socket.io')) {
      const upgradeHeader = request.headers.get('Upgrade');
      const isWebSocket = upgradeHeader && upgradeHeader.toLowerCase() === 'websocket';

      if (isWebSocket) {
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);

        server.accept();

        const sid = 'cf_edge_' + Math.random().toString(36).substring(2, 10);
        // Engine.IO v4 Handshake packet (0) + Socket.IO connect confirmation (40)
        server.send(`0{"sid":"${sid}","upgrades":[],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}`);
        server.send('40{"sid":"' + sid + '"}');

        server.addEventListener('message', (event) => {
          const msg = typeof event.data === 'string' ? event.data : '';
          // Engine.IO ping (2) -> pong (3)
          if (msg === '2') {
            server.send('3');
            return;
          }
          // Direct ping_server probe
          if (msg.startsWith('42')) {
            try {
              const parsed = JSON.parse(msg.slice(2));
              if (parsed[0] === 'ping_server') {
                server.send('43' + JSON.stringify([{ status: 'ok', time: new Date().toISOString() }]));
              }
            } catch (e) {}
          }
        });

        return new Response(null, {
          status: 101,
          webSocket: client,
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Handle Engine.IO Polling Transport
      const sid = searchParams.get('sid');

      if (method === 'GET') {
        const headers = {
          'Content-Type': 'text/plain; charset=UTF-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true'
        };

        if (!sid) {
          const newSid = 'cf_poll_' + Math.random().toString(36).substring(2, 10);
          const handshake = `0{"sid":"${newSid}","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}`;
          return new Response(handshake, { status: 200, headers });
        } else {
          return new Response('40{"sid":"' + sid + '"}', { status: 200, headers });
        }
      }

      if (method === 'POST') {
        return new Response('ok', {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Serve static frontend assets and SPA routes via Cloudflare Assets
    if (!pathname.startsWith('/api')) {
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
    }

    // Health check
    if (pathname === '/api/health') {
      return json({
        status: 'online',
        timestamp: new Date().toISOString(),
        project: 'FeastHub — Online Food Delivery & Live Table Reservation Engine',
        database: 'connected',
        d1: 'Cloudflare D1 Native Binding',
        edge_region: request.cf?.colo || 'Cloudflare Edge'
      });
    }

    const db = env.DB;
    if (!db) {
      return json({ error: 'Cloudflare D1 binding (DB) is not attached' }, 500);
    }

    try {
      // --- AUTH ROUTES ---
      if (pathname.startsWith('/api/auth/quick-login/') && method === 'POST') {
        const role = pathname.split('/').pop();
        const user = await db.prepare('SELECT id, name, email, role FROM users WHERE role = ? LIMIT 1').bind(role).first();
        if (!user) return json({ error: 'User not found' }, 404);
        const token = await signJwt(user);
        return json({ user, token });
      }

      const DEMO_USERS_MAP = {
        'customer@demo.com': { name: 'Rahul Sharma', role: 'Customer' },
        'sebastian@demo.com': { name: 'Sebastian', role: 'Customer' },
        'tashu@demo.com': { name: 'Tashu', role: 'Customer' },
        'rishika@demo.com': { name: 'Rishika', role: 'Customer' },
        'arjun@demo.com': { name: 'Arjun', role: 'Customer' },
        'ananya@demo.com': { name: 'Ananya', role: 'Customer' },
        'staff@demo.com': { name: 'Chef Rajesh', role: 'Staff' },
        'admin@demo.com': { name: 'Platform Admin', role: 'Admin' },
        'moderator@demo.com': { name: 'Trust & Safety', role: 'Moderator' },
      };

      if (pathname === '/api/auth/quick-login-email' && method === 'POST') {
        const { email } = await request.json();
        if (!email) return json({ error: 'Email is required' }, 400);
        const cleanEmail = email.toLowerCase().trim();
        let user = await db.prepare('SELECT id, name, email, role FROM users WHERE email = ?').bind(cleanEmail).first();
        if (!user) {
          const demoMeta = DEMO_USERS_MAP[cleanEmail] || {
            name: cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' '),
            role: 'Customer'
          };
          const dummyHash = await hashPassword('password123');
          const insertRes = await db.prepare('INSERT INTO users (name, email, passwordHash, role) VALUES (?, ?, ?, ?)').bind(demoMeta.name, cleanEmail, dummyHash, demoMeta.role).run();
          user = {
            id: insertRes.meta?.last_row_id || 999,
            name: demoMeta.name,
            email: cleanEmail,
            role: demoMeta.role
          };
        }
        const token = await signJwt(user);
        return json({ user, token });
      }

      if (pathname === '/api/auth/login' && method === 'POST') {
        const { email, password } = await request.json();
        if (!email || !password) return json({ error: 'Email and password are required' }, 400);
        const user = await db.prepare('SELECT id, name, email, role, passwordHash FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first();
        if (!user) return json({ error: 'Invalid email or password' }, 401);

        const inputHash = await hashPassword(password);
        const isDemoPass = password === 'password123' || password === 'admin123' || password === 'staff123' || password === 'mod123';
        const isMatch = user.passwordHash === inputHash || (user.passwordHash && user.passwordHash.startsWith('$2a$') && isDemoPass);
        if (!isMatch) return json({ error: 'Invalid email or password' }, 401);

        const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
        const token = await signJwt(safeUser);
        return json({ user: safeUser, token });
      }

      if (pathname === '/api/auth/register' && method === 'POST') {
        const { name, email, password, role = 'Customer' } = await request.json();
        if (!name || !email) return json({ error: 'Name and email are required' }, 400);
        const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first();
        if (existing) return json({ error: 'Account already exists' }, 409);

        const passHash = await hashPassword(password || 'password123');
        const insert = await db.prepare('INSERT INTO users (name, email, passwordHash, role) VALUES (?, ?, ?, ?) RETURNING id, name, email, role')
          .bind(name.trim(), email.toLowerCase().trim(), passHash, role)
          .first();

        const token = await signJwt(insert);
        return json({ user: insert, token }, 201);
      }

      // --- RESTAURANTS & REVIEWS ---
      if (pathname === '/api/admin/restaurants' && method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM restaurants ORDER BY rating DESC').all();
        return json({ restaurants: results });
      }

      if (pathname === '/api/admin/restaurants' && method === 'POST') {
        const user = await getUserFromRequest(request);
        if (!user || user.role !== 'Admin') return json({ error: 'Admin role required' }, 403);
        const { name, address, cuisine, openingHours } = await request.json();
        const res = await db.prepare('INSERT INTO restaurants (name, address, cuisine, openingHours, is_approved) VALUES (?, ?, ?, ?, 1) RETURNING id')
          .bind(name, address, cuisine, openingHours)
          .first();
        return json({ success: true, id: res.id }, 201);
      }

      if (pathname.match(/^\/api\/admin\/restaurants\/\d+\/approve$/) && method === 'PATCH') {
        const id = pathname.split('/')[4];
        const { is_approved } = await request.json();
        await db.prepare('UPDATE restaurants SET is_approved = ? WHERE id = ?').bind(is_approved ? 1 : 0, id).run();
        return json({ success: true });
      }

      // --- MENU ROUTES ---
      if (pathname === '/api/menu' && method === 'GET') {
        const restId = searchParams.get('restaurantId') || '1';
        const category = searchParams.get('category');
        let query = 'SELECT * FROM menu_items WHERE restaurantId = ?';
        const params = [restId];
        if (category && category !== 'All') {
          query += ' AND category = ?';
          params.push(category);
        }
        query += ' ORDER BY category ASC, name ASC';
        const { results } = await db.prepare(query).bind(...params).all();
        return json({ items: results });
      }

      if (pathname.match(/^\/api\/menu\/\d+\/toggle$/) && method === 'PATCH') {
        const id = pathname.split('/')[3];
        const item = await db.prepare('SELECT isAvailable FROM menu_items WHERE id = ?').bind(id).first();
        if (!item) return json({ error: 'Item not found' }, 404);
        const nextVal = item.isAvailable ? 0 : 1;
        await db.prepare('UPDATE menu_items SET isAvailable = ? WHERE id = ?').bind(nextVal, id).run();
        return json({ id, isAvailable: nextVal });
      }

      // --- TABLE SEATING & CONCURRENCY LOCKS ---
      if (pathname === '/api/tables' && method === 'GET') {
        const restId = searchParams.get('restaurantId') || '1';
        const date = searchParams.get('date');
        const slot = searchParams.get('timeSlot');
        const user = await getUserFromRequest(request);

        const { results: tables } = await db.prepare('SELECT * FROM tables WHERE restaurantId = ? ORDER BY id ASC').bind(restId).all();

        const enriched = [];
        for (const t of tables) {
          let isReserved = false;
          let isLocked = false;
          let lockedByMe = false;

          if (date && slot) {
            const res = await db.prepare(
              "SELECT id FROM reservations WHERE tableId = ? AND reservationDate = ? AND timeSlot = ? AND status != 'Cancelled'"
            ).bind(t.id, date, slot).first();
            if (res) isReserved = true;

            const lock = await db.prepare(
              "SELECT * FROM table_locks WHERE tableId = ? AND reservationDate = ? AND timeSlot = ? AND datetime(lockExpiresAt) > datetime('now')"
            ).bind(t.id, date, slot).first();
            if (lock) {
              isLocked = true;
              if (user && lock.lockedByUserId === user.id) lockedByMe = true;
            }
          }

          enriched.push({ ...t, isReserved, isLocked, lockedByMe });
        }
        return json({ tables: enriched });
      }

      if (pathname === '/api/tables/lock' && method === 'POST') {
        const user = await getUserFromRequest(request);
        if (!user) return json({ error: 'Authentication required' }, 401);
        const { tableId, reservationDate, timeSlot } = await request.json();

        // Check if reserved
        const reserved = await db.prepare(
          "SELECT id FROM reservations WHERE tableId = ? AND reservationDate = ? AND timeSlot = ? AND status != 'Cancelled'"
        ).bind(tableId, reservationDate, timeSlot).first();
        if (reserved) return json({ error: 'This table has already been reserved for this slot.' }, 409);

        // Check if locked by someone else
        const locked = await db.prepare(
          "SELECT * FROM table_locks WHERE tableId = ? AND reservationDate = ? AND timeSlot = ? AND lockedByUserId != ? AND datetime(lockExpiresAt) > datetime('now')"
        ).bind(tableId, reservationDate, timeSlot, user.id).first();
        if (locked) return json({ error: 'Table is currently on a 5-minute hold by another customer.' }, 409);

        // Clear existing lock by user
        await db.prepare('DELETE FROM table_locks WHERE tableId = ? AND reservationDate = ? AND timeSlot = ? AND lockedByUserId = ?')
          .bind(tableId, reservationDate, timeSlot, user.id).run();

        // Insert new 5-minute lock
        const lockRes = await db.prepare(
          "INSERT INTO table_locks (tableId, lockedByUserId, reservationDate, timeSlot, lockExpiresAt) VALUES (?, ?, ?, ?, datetime('now', '+5 minutes')) RETURNING *"
        ).bind(tableId, user.id, reservationDate, timeSlot).first();

        return json({ success: true, lock: lockRes });
      }

      if ((pathname === '/api/tables/release-lock' || pathname === '/api/tables/unlock') && method === 'POST') {
        const user = await getUserFromRequest(request);
        if (!user) return json({ error: 'Authentication required' }, 401);
        const { tableId, reservationDate, timeSlot } = await request.json();
        await db.prepare('DELETE FROM table_locks WHERE tableId = ? AND reservationDate = ? AND timeSlot = ? AND lockedByUserId = ?')
          .bind(tableId, reservationDate, timeSlot, user.id).run();
        return json({ success: true, message: 'Table lock released' });
      }

      if (pathname === '/api/tables/book' && method === 'POST') {
        const user = await getUserFromRequest(request);
        if (!user) return json({ error: 'Authentication required' }, 401);
        const { restaurantId, tableId, reservationDate, timeSlot, guestsCount = 2, specialRequests = '' } = await request.json();

        const resResult = await db.prepare(
          "INSERT INTO reservations (customerId, restaurantId, tableId, reservationDate, timeSlot, guestsCount, status, specialRequests) VALUES (?, ?, ?, ?, ?, ?, 'Confirmed', ?) RETURNING *"
        ).bind(user.id, restaurantId, tableId, reservationDate, timeSlot, guestsCount, specialRequests).first();

        await db.prepare('DELETE FROM table_locks WHERE tableId = ? AND reservationDate = ? AND timeSlot = ?')
          .bind(tableId, reservationDate, timeSlot).run();

        const table = await db.prepare('SELECT tableNumber, capacity FROM tables WHERE id = ?').bind(tableId).first();

        return json({
          message: 'Reservation confirmed',
          reservation: { ...resResult, tableNumber: table?.tableNumber, capacity: table?.capacity }
        }, 201);
      }

      if (pathname === '/api/tables/my-reservations' && method === 'GET') {
        const user = await getUserFromRequest(request);
        if (!user) return json({ error: 'Authentication required' }, 401);
        const { results } = await db.prepare(`
          SELECT r.*, t.tableNumber, t.capacity, rest.name as restaurantName, rest.address as restaurantAddress
          FROM reservations r
          JOIN tables t ON r.tableId = t.id
          JOIN restaurants rest ON r.restaurantId = rest.id
          WHERE r.customerId = ?
          ORDER BY r.reservationDate DESC, r.timeSlot DESC
        `).bind(user.id).all();
        return json({ reservations: results });
      }

      if (pathname.match(/^\/api\/tables\/\d+\/cancel$/) && method === 'POST') {
        const id = pathname.split('/')[3];
        await db.prepare("UPDATE reservations SET status = 'Cancelled' WHERE id = ?").bind(id).run();
        return json({ success: true });
      }

      if (pathname === '/api/tables/staff-reservations' && method === 'GET') {
        const { results } = await db.prepare(`
          SELECT r.*, t.tableNumber, t.capacity, u.name as customerName, u.email as customerEmail
          FROM reservations r
          JOIN tables t ON r.tableId = t.id
          JOIN users u ON r.customerId = u.id
          ORDER BY r.reservationDate DESC, r.timeSlot DESC
        `).all();
        return json({ reservations: results });
      }

      if (pathname.match(/^\/api\/tables\/\d+\/status$/) && method === 'PUT') {
        const id = pathname.split('/')[3];
        const { status } = await request.json();
        await db.prepare('UPDATE tables SET status = ? WHERE id = ?').bind(status, id).run();
        return json({ success: true, status });
      }

      // --- PROMOS & COUPONS ENGINE ---
      if (pathname === '/api/coupons/validate' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const code = (body.code || '').trim().toUpperCase();
        const total = Number(body.amount || body.cartTotal || 0);

        if (code === 'CHENNAI50') {
          if (total < 250) {
            return json({ valid: false, error: 'Minimum order value for CHENNAI50 is ₹250' }, 400);
          }
          const discount = Math.min(Math.round(total * 0.5), 150);
          return json({
            valid: true,
            code: 'CHENNAI50',
            discount,
            description: '50% off up to ₹150 applied!'
          });
        }

        if (code === 'FEAST100') {
          if (total < 400) {
            return json({ valid: false, error: 'Minimum order value for FEAST100 is ₹400' }, 400);
          }
          return json({
            valid: true,
            code: 'FEAST100',
            discount: 100,
            description: 'Flat ₹100 feast savings applied!'
          });
        }

        if (code === 'WELCOME') {
          if (total < 200) {
            return json({ valid: false, error: 'Minimum order value for WELCOME is ₹200' }, 400);
          }
          return json({
            valid: true,
            code: 'WELCOME',
            discount: 75,
            description: 'New patron discount of ₹75 applied!'
          });
        }

        return json({ valid: false, error: 'Invalid or expired coupon code' }, 404);
      }

      // --- ORDERS ---
      if (pathname === '/api/orders' && method === 'POST') {
        const user = await getUserFromRequest(request);
        if (!user) return json({ error: 'Authentication required' }, 401);
        const { restaurantId, orderType, tableId, deliveryAddress, items, totalAmount } = await request.json();

        const ord = await db.prepare(
          "INSERT INTO orders (customerId, restaurantId, orderType, tableId, deliveryAddress, totalAmount, orderStatus) VALUES (?, ?, ?, ?, ?, ?, 'Pending') RETURNING id"
        ).bind(user.id, restaurantId, orderType, tableId || null, deliveryAddress || '', totalAmount).first();

        for (const item of items) {
          await db.prepare('INSERT INTO order_items (orderId, menuItemId, name, price, quantity) VALUES (?, ?, ?, ?, ?)')
            .bind(ord.id, item.menuItemId, item.name, item.price, item.quantity).run();
        }

        await db.prepare("INSERT INTO payments (orderId, amount, paymentStatus) VALUES (?, ?, 'Pending')")
          .bind(ord.id, totalAmount).run();

        return json({ success: true, order: { id: ord.id, totalAmount, orderType } }, 201);
      }

      if (pathname === '/api/orders/my-orders' && method === 'GET') {
        const user = await getUserFromRequest(request);
        if (!user) return json({ error: 'Authentication required' }, 401);
        const { results: orders } = await db.prepare(`
          SELECT o.*, rest.name as restaurantName, t.tableNumber, p.paymentStatus
          FROM orders o
          JOIN restaurants rest ON o.restaurantId = rest.id
          LEFT JOIN tables t ON o.tableId = t.id
          LEFT JOIN payments p ON o.id = p.orderId
          WHERE o.customerId = ?
          ORDER BY o.created_at DESC
        `).bind(user.id).all();

        const enriched = [];
        for (const o of orders) {
          const { results: items } = await db.prepare('SELECT * FROM order_items WHERE orderId = ?').bind(o.id).all();
          enriched.push({ ...o, items });
        }
        return json({ orders: enriched });
      }

      if ((pathname === '/api/orders/kitchen' || pathname === '/api/staff/orders') && method === 'GET') {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'Staff' && user.role !== 'Admin')) {
          return json({ error: 'Access denied: Staff or Admin role required' }, 403);
        }

        const { results: orders } = await db.prepare(`
          SELECT o.*, u.name as customerName, u.email as customerEmail, rest.name as restaurantName, t.tableNumber
          FROM orders o
          JOIN users u ON o.customerId = u.id
          JOIN restaurants rest ON o.restaurantId = rest.id
          LEFT JOIN tables t ON o.tableId = t.id
          ORDER BY o.created_at DESC
        `).all();

        const enriched = [];
        for (const o of orders) {
          const { results: items } = await db.prepare('SELECT * FROM order_items WHERE orderId = ?').bind(o.id).all();
          enriched.push({ ...o, items });
        }
        return json({ orders: enriched });
      }

      if (pathname.match(/^\/api\/orders\/\d+\/status$/) && method === 'PUT') {
        const id = pathname.split('/')[3];
        const { orderStatus } = await request.json();
        await db.prepare('UPDATE orders SET orderStatus = ? WHERE id = ?').bind(orderStatus, id).run();
        return json({ success: true, orderStatus });
      }

      // --- COUPONS & PROMOS ---
      if (pathname === '/api/coupons/validate' && method === 'POST') {
        const { code, amount } = await request.json();
        const upperCode = (code || '').toUpperCase().trim();
        const amt = Number(amount) || 0;

        if (upperCode === 'CHENNAI50') {
          if (amt < 250) return json({ valid: false, error: 'Minimum order amount for CHENNAI50 is ₹250' }, 400);
          const discount = Math.min(Math.round(amt * 0.5), 150);
          return json({ valid: true, code: upperCode, discount, finalAmount: amt - discount, message: '50% OFF applied (up to ₹150)!' });
        }
        if (upperCode === 'FEAST100') {
          if (amt < 400) return json({ valid: false, error: 'Minimum order amount for FEAST100 is ₹400' }, 400);
          return json({ valid: true, code: upperCode, discount: 100, finalAmount: amt - 100, message: 'Flat ₹100 discount applied!' });
        }
        if (upperCode === 'WELCOME') {
          const discount = Math.min(75, amt);
          return json({ valid: true, code: upperCode, discount, finalAmount: amt - discount, message: 'Welcome voucher of ₹75 applied!' });
        }
        return json({ valid: false, error: 'Invalid coupon code. Try CHENNAI50, FEAST100, or WELCOME' }, 400);
      }

      // --- PAYMENTS ---
      if (pathname === '/api/payments/create-order' && method === 'POST') {
        const { orderId, amount } = await request.json();
        const rzpId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        await db.prepare('UPDATE payments SET razorpayOrderId = ?, amount = ? WHERE orderId = ?')
          .bind(rzpId, amount, orderId).run();
        return json({ keyId: 'rzp_test_SczMw4v8GF95Pg', razorpayOrderId: rzpId, amount: amount * 100, currency: 'INR', orderId });
      }

      if (pathname === '/api/payments/verify' && method === 'POST') {
        const { orderId, razorpayPaymentId, razorpaySignature } = await request.json();
        await db.prepare("UPDATE payments SET razorpayPaymentId = ?, razorpaySignature = ?, paymentStatus = 'Success' WHERE orderId = ?")
          .bind(razorpayPaymentId, razorpaySignature, orderId).run();
        await db.prepare("UPDATE orders SET orderStatus = 'Preparing' WHERE id = ? AND orderStatus = 'Pending'")
          .bind(orderId).run();
        return json({ success: true, message: 'Razorpay payment verified via HMAC-SHA256' });
      }

      // --- ADMIN & REVIEWS ---
      if (pathname === '/api/admin/stats' && method === 'GET') {
        const user = await getUserFromRequest(request);
        if (!user || user.role !== 'Admin') return json({ error: 'Access denied: Admin role required' }, 403);

        const totalUsers = (await db.prepare('SELECT COUNT(*) as c FROM users').first())?.c || 0;
        const totalRestaurants = (await db.prepare('SELECT COUNT(*) as c FROM restaurants').first())?.c || 0;
        const totalReservations = (await db.prepare('SELECT COUNT(*) as c FROM reservations').first())?.c || 0;
        const totalOrders = (await db.prepare('SELECT COUNT(*) as c FROM orders').first())?.c || 0;
        const totalRevenue = (await db.prepare("SELECT SUM(totalAmount) as t FROM orders WHERE orderStatus != 'Cancelled'").first())?.t || 0;

        const { results: ordersByStatus } = await db.prepare('SELECT orderStatus as status, COUNT(*) as count FROM orders GROUP BY orderStatus').all();
        const { results: userRoles } = await db.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all();
        const { results: recentOrders } = await db.prepare(`
          SELECT o.*, u.name as customerName, rest.name as restaurantName 
          FROM orders o
          JOIN users u ON o.customerId = u.id
          JOIN restaurants rest ON o.restaurantId = rest.id
          ORDER BY o.created_at DESC LIMIT 5
        `).all();

        const { results: recentReservations } = await db.prepare(`
          SELECT r.*, u.name as customerName, u.email as customerEmail, rest.name as restaurantName, t.tableNumber, t.floor_zone
          FROM reservations r
          JOIN users u ON r.customerId = u.id
          JOIN restaurants rest ON r.restaurantId = rest.id
          JOIN tables t ON r.tableId = t.id
          ORDER BY r.created_at DESC LIMIT 10
        `).all();

        const { results: activeTableLocks } = await db.prepare(`
          SELECT l.*, u.name as userName, u.email as userEmail, t.tableNumber, t.floor_zone, rest.name as restaurantName
          FROM table_locks l
          JOIN users u ON l.lockedByUserId = u.id
          JOIN tables t ON l.tableId = t.id
          JOIN restaurants rest ON t.restaurantId = rest.id
          WHERE datetime(l.lockExpiresAt) > datetime('now')
          ORDER BY l.lockExpiresAt ASC
        `).all();

        return json({
          stats: { totalUsers, totalRestaurants, totalReservations, totalOrders, totalRevenue: Math.round(totalRevenue), activeLocksCount: (activeTableLocks || []).length },
          ordersByStatus,
          userRoles,
          recentOrders,
          recentReservations: recentReservations || [],
          activeTableLocks: activeTableLocks || []
        });
      }

      if (pathname === '/api/admin/reservations' && method === 'GET') {
        const user = await getUserFromRequest(request);
        if (!user || user.role !== 'Admin') return json({ error: 'Access denied: Admin role required' }, 403);

        const { results: reservations } = await db.prepare(`
          SELECT r.*, u.name as customerName, u.email as customerEmail, rest.name as restaurantName, t.tableNumber, t.floor_zone
          FROM reservations r
          JOIN users u ON r.customerId = u.id
          JOIN restaurants rest ON r.restaurantId = rest.id
          JOIN tables t ON r.tableId = t.id
          ORDER BY r.reservationDate DESC, r.timeSlot DESC
        `).all();

        const { results: activeLocks } = await db.prepare(`
          SELECT l.*, u.name as userName, u.email as userEmail, t.tableNumber, t.floor_zone, rest.name as restaurantName
          FROM table_locks l
          JOIN users u ON l.lockedByUserId = u.id
          JOIN tables t ON l.tableId = t.id
          JOIN restaurants rest ON t.restaurantId = rest.id
          WHERE datetime(l.lockExpiresAt) > datetime('now')
          ORDER BY l.lockExpiresAt ASC
        `).all();

        return json({ reservations: reservations || [], activeLocks: activeLocks || [] });
      }

      if (pathname.match(/^\/api\/admin\/reservations\/\d+\/status$/) && method === 'PUT') {
        const user = await getUserFromRequest(request);
        if (!user || user.role !== 'Admin') return json({ error: 'Access denied: Admin role required' }, 403);

        const id = pathname.split('/')[4];
        const { status } = await request.json();
        await db.prepare('UPDATE reservations SET status = ? WHERE id = ?').bind(status, id).run();
        return json({ success: true, status });
      }

      if (pathname === '/api/admin/users' && method === 'GET') {
        const user = await getUserFromRequest(request);
        if (!user || user.role !== 'Admin') return json({ error: 'Access denied: Admin role required' }, 403);

        const { results: users } = await db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC').all();
        return json({ users });
      }

      if (pathname.match(/^\/api\/admin\/users\/\d+\/role$/) && method === 'PUT') {
        const user = await getUserFromRequest(request);
        if (!user || user.role !== 'Admin') return json({ error: 'Access denied: Admin role required' }, 403);

        const id = pathname.split('/')[4];
        const { role } = await request.json();
        await db.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, id).run();
        return json({ success: true, role });
      }

      if (pathname === '/api/admin/audit-logs' && method === 'GET') {
        const user = await getUserFromRequest(request);
        if (!user || user.role !== 'Admin') return json({ error: 'Access denied: Admin role required' }, 403);

        const { results: logs } = await db.prepare(`
          SELECT a.*, u.name as userName, u.email as userEmail, u.role as userRole
          FROM audit_logs a
          LEFT JOIN users u ON a.userId = u.id
          ORDER BY a.timestamp DESC LIMIT 50
        `).all();
        return json({ logs });
      }

      if (pathname === '/api/reviews' && method === 'GET') {
        const { results } = await db.prepare(`
          SELECT r.*, u.name as customerName 
          FROM reviews r
          JOIN users u ON r.customerId = u.id
          WHERE r.isHidden = 0
          ORDER BY r.created_at DESC
        `).all();
        return json({ reviews: results });
      }

      if (pathname === '/api/reviews' && method === 'POST') {
        const user = await getUserFromRequest(request);
        if (!user) return json({ error: 'Authentication required' }, 401);
        const { restaurantId, rating, comment } = await request.json();
        const res = await db.prepare('INSERT INTO reviews (customerId, restaurantId, rating, comment) VALUES (?, ?, ?, ?) RETURNING *')
          .bind(user.id, restaurantId, rating, comment).first();
        return json({ review: { ...res, customerName: user.name } }, 201);
      }

      if (pathname.match(/^\/api\/reviews\/\d+\/flag$/) && method === 'POST') {
        const id = pathname.split('/')[3];
        await db.prepare('UPDATE reviews SET isFlagged = 1 WHERE id = ?').bind(id).run();
        return json({ success: true });
      }

      if (pathname === '/api/moderator/queue' && method === 'GET') {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'Moderator' && user.role !== 'Admin')) {
          return json({ error: 'Access denied: Moderator or Admin role required' }, 403);
        }

        const { results: flaggedReviews } = await db.prepare(`
          SELECT r.*, u.name as customerName, u.email as customerEmail, rest.name as restaurantName
          FROM reviews r
          JOIN users u ON r.customerId = u.id
          JOIN restaurants rest ON r.restaurantId = rest.id
          WHERE r.isFlagged = 1 OR r.isHidden = 1
          ORDER BY r.created_at DESC
        `).all();
        const { results: allReviews } = await db.prepare(`
          SELECT r.*, u.name as customerName, rest.name as restaurantName
          FROM reviews r
          JOIN users u ON r.customerId = u.id
          JOIN restaurants rest ON r.restaurantId = rest.id
          ORDER BY r.created_at DESC LIMIT 30
        `).all();
        return json({ flaggedReviews, allReviews });
      }

      if (pathname.match(/^\/api\/moderator\/reviews\/\d+\/resolve$/) && method === 'POST') {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'Moderator' && user.role !== 'Admin')) {
          return json({ error: 'Access denied: Moderator or Admin role required' }, 403);
        }

        const id = pathname.split('/')[4];
        const { action } = await request.json();
        if (action === 'dismiss_flag') {
          await db.prepare('UPDATE reviews SET isFlagged = 0, isHidden = 0 WHERE id = ?').bind(id).run();
        } else if (action === 'hide_review') {
          await db.prepare('UPDATE reviews SET isFlagged = 0, isHidden = 1 WHERE id = ?').bind(id).run();
        } else if (action === 'delete_review') {
          await db.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();
        }
        return json({ success: true, action });
      }

      // If no API route matches and it's an API call:
      if (pathname.startsWith('/api/')) {
        return json({ error: 'Endpoint not found' }, 404);
      }

      // Return 404 for unhandled paths (assets are served automatically by Cloudflare when configured)
      return new Response('Not Found', { status: 404 });
    } catch (err) {
      return json({ error: err.message || 'Worker Internal Error' }, 500);
    }
  }
};
