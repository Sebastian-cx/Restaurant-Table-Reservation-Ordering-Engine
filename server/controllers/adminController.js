const db = require('../db');
const { broadcastEvent, emitToUser, emitToStaff, emitToAdmin } = require('../socket');

exports.getPlatformStats = (req, res) => {
  try {
    const totalUsers = db.get('SELECT COUNT(*) as count FROM users')?.count || 0;
    const totalRestaurants = db.get('SELECT COUNT(*) as count FROM restaurants')?.count || 0;
    const totalReservations = db.get('SELECT COUNT(*) as count FROM reservations')?.count || 0;
    const totalOrders = db.get('SELECT COUNT(*) as count FROM orders')?.count || 0;
    const revenueRow = db.get("SELECT SUM(totalAmount) as total FROM orders WHERE orderStatus != 'Cancelled'");
    const totalRevenue = revenueRow?.total || 0;

    const ordersByStatus = db.all(
      'SELECT orderStatus as status, COUNT(*) as count FROM orders GROUP BY orderStatus'
    );

    const userRoles = db.all(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    );

    const recentOrders = db.all(
      `SELECT o.*, u.name as customerName, rest.name as restaurantName 
       FROM orders o
       JOIN users u ON o.customerId = u.id
       JOIN restaurants rest ON o.restaurantId = rest.id
       ORDER BY o.created_at DESC LIMIT 5`
    );

    const recentReservations = db.all(
      `SELECT r.*, u.name as customerName, u.email as customerEmail, rest.name as restaurantName, t.tableNumber, t.floor_zone
       FROM reservations r
       JOIN users u ON r.customerId = u.id
       JOIN restaurants rest ON r.restaurantId = rest.id
       JOIN tables t ON r.tableId = t.id
       ORDER BY r.created_at DESC LIMIT 10`
    );

    const activeTableLocks = db.all(
      `SELECT l.*, u.name as userName, u.email as userEmail, t.tableNumber, t.floor_zone, rest.name as restaurantName
       FROM table_locks l
       JOIN users u ON l.lockedByUserId = u.id
       JOIN tables t ON l.tableId = t.id
       JOIN restaurants rest ON t.restaurantId = rest.id
       WHERE datetime(l.lockExpiresAt) > datetime('now')
       ORDER BY l.lockExpiresAt ASC`
    );

    return res.json({
      stats: {
        totalUsers,
        totalRestaurants,
        totalReservations,
        totalOrders,
        totalRevenue: Math.round(totalRevenue),
        activeLocksCount: activeTableLocks.length
      },
      ordersByStatus,
      userRoles,
      recentOrders,
      recentReservations,
      activeTableLocks
    });
  } catch (err) {
    console.error('getPlatformStats error:', err);
    return res.status(500).json({ error: 'Failed to fetch platform statistics.' });
  }
};

exports.listAllReservations = (req, res) => {
  try {
    const reservations = db.all(
      `SELECT r.*, u.name as customerName, u.email as customerEmail, rest.name as restaurantName, t.tableNumber, t.floor_zone
       FROM reservations r
       JOIN users u ON r.customerId = u.id
       JOIN restaurants rest ON r.restaurantId = rest.id
       JOIN tables t ON r.tableId = t.id
       ORDER BY r.reservationDate DESC, r.timeSlot DESC`
    );

    const activeLocks = db.all(
      `SELECT l.*, u.name as userName, u.email as userEmail, t.tableNumber, t.floor_zone, rest.name as restaurantName
       FROM table_locks l
       JOIN users u ON l.lockedByUserId = u.id
       JOIN tables t ON l.tableId = t.id
       JOIN restaurants rest ON t.restaurantId = rest.id
       WHERE datetime(l.lockExpiresAt) > datetime('now')
       ORDER BY l.lockExpiresAt ASC`
    );

    return res.json({ reservations, activeLocks });
  } catch (err) {
    console.error('listAllReservations error:', err);
    return res.status(500).json({ error: 'Failed to fetch reservations.' });
  }
};

exports.updateReservationStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Confirmed', 'Seated', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid reservation status.' });
    }

    db.run('UPDATE reservations SET status = ? WHERE id = ?', [status, id]);
    
    db.run('INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'RESERVATION_STATUS_UPDATED',
      `Admin updated reservation #${id} status to ${status}`
    ]);

    const resRecord = db.get('SELECT * FROM reservations WHERE id = ?', [id]);
    const payload = { id: Number(id), reservationId: Number(id), status };
    broadcastEvent('reservation_status_updated', payload);
    emitToStaff('reservation_status_updated', payload);
    if (resRecord && resRecord.customerId) {
      emitToUser(resRecord.customerId, 'reservation_status_updated', payload);
    }
    emitToAdmin('admin_stats_updated', { type: 'RESERVATION_STATUS_UPDATED', id: Number(id), status });

    return res.json({ success: true, status });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update reservation status.' });
  }
};

exports.listUsers = (req, res) => {
  try {
    const users = db.all('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

exports.updateUserRole = (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['Customer', 'Staff', 'Admin', 'Moderator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid user role.' });
    }

    db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);

    db.run('INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'USER_ROLE_UPDATED',
      `User #${id} role changed to ${role}`
    ]);

    return res.json({ message: `Role updated to ${role} successfully.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user role.' });
  }
};

exports.listRestaurants = (req, res) => {
  try {
    const restaurants = db.all('SELECT * FROM restaurants ORDER BY id ASC');
    return res.json({ restaurants });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch restaurants.' });
  }
};

exports.approveRestaurant = (req, res) => {
  try {
    const { id } = req.params;
    const { is_approved } = req.body;

    db.run('UPDATE restaurants SET is_approved = ? WHERE id = ?', [is_approved ? 1 : 0, id]);

    db.run('INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'RESTAURANT_APPROVAL_TOGGLED',
      `Restaurant #${id} approval set to ${is_approved ? 1 : 0}`
    ]);

    return res.json({ message: 'Restaurant approval status updated.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update restaurant status.' });
  }
};

exports.createRestaurant = (req, res) => {
  try {
    const { name, address, cuisine, openingHours } = req.body;
    if (!name || !address || !cuisine || !openingHours) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const result = db.run(
      'INSERT INTO restaurants (name, address, cuisine, openingHours, is_approved) VALUES (?, ?, ?, ?, 1)',
      [name.trim(), address.trim(), cuisine.trim(), openingHours.trim()]
    );

    const restaurantId = Number(result.lastInsertRowid);

    // Create 4 default tables for this new restaurant
    db.run('INSERT INTO tables (restaurantId, tableNumber, capacity, status, floor_zone) VALUES (?, ?, ?, ?, ?)', [
      restaurantId, 'T1', 2, 'Available', 'Main Hall'
    ]);
    db.run('INSERT INTO tables (restaurantId, tableNumber, capacity, status, floor_zone) VALUES (?, ?, ?, ?, ?)', [
      restaurantId, 'T2', 4, 'Available', 'Main Hall'
    ]);
    db.run('INSERT INTO tables (restaurantId, tableNumber, capacity, status, floor_zone) VALUES (?, ?, ?, ?, ?)', [
      restaurantId, 'T3', 4, 'Available', 'Window View'
    ]);
    db.run('INSERT INTO tables (restaurantId, tableNumber, capacity, status, floor_zone) VALUES (?, ?, ?, ?, ?)', [
      restaurantId, 'T4', 6, 'Available', 'Patio'
    ]);

    return res.status(201).json({ message: 'Restaurant created successfully.', id: restaurantId });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to onboard restaurant.' });
  }
};

exports.getAuditLogs = (req, res) => {
  try {
    const logs = db.all(
      `SELECT a.*, u.name as userName, u.email as userEmail, u.role as userRole
       FROM audit_logs a
       LEFT JOIN users u ON a.userId = u.id
       ORDER BY a.timestamp DESC LIMIT 50`
    );
    return res.json({ logs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
};
