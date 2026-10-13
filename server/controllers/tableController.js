const db = require('../db');
const { broadcastEvent, emitToStaff, emitToAdmin, emitToUser } = require('../socket');

// Helper to clear expired locks across the system
function cleanExpiredLocks() {
  db.run("DELETE FROM table_locks WHERE datetime(lockExpiresAt) <= datetime('now')");
}

exports.getTables = (req, res) => {
  try {
    cleanExpiredLocks();
    const { restaurantId, date, timeSlot } = req.query;
    const currentUserId = req.user ? req.user.id : null;

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required.' });
    }

    const tables = db.all('SELECT * FROM tables WHERE restaurantId = ? ORDER BY id ASC', [restaurantId]);

    // If date and timeSlot are provided, check real-time availability & temporary locks
    const enrichedTables = tables.map(table => {
      let isReserved = false;
      let isLocked = false;
      let lockedByMe = false;

      if (date && timeSlot) {
        const reservation = db.get(
          `SELECT id FROM reservations 
           WHERE tableId = ? AND reservationDate = ? AND timeSlot = ? AND status != 'Cancelled' LIMIT 1`,
          [table.id, date, timeSlot]
        );
        if (reservation) {
          isReserved = true;
        }

        const lock = db.get(
          `SELECT * FROM table_locks 
           WHERE tableId = ? AND reservationDate = ? AND timeSlot = ? 
           AND datetime(lockExpiresAt) > datetime('now') LIMIT 1`,
          [table.id, date, timeSlot]
        );
        if (lock) {
          isLocked = true;
          if (currentUserId && lock.lockedByUserId === currentUserId) {
            lockedByMe = true;
          }
        }
      }

      let dynamicStatus = table.status;
      if (isReserved) dynamicStatus = 'Reserved';
      else if (isLocked) dynamicStatus = 'Locked (Holding)';

      return {
        ...table,
        isReserved,
        isLocked,
        lockedByMe,
        dynamicStatus
      };
    });

    return res.json({ tables: enrichedTables });
  } catch (err) {
    console.error('getTables error:', err);
    return res.status(500).json({ error: 'Failed to fetch tables.' });
  }
};

exports.acquireLock = (req, res) => {
  try {
    cleanExpiredLocks();
    const { tableId, reservationDate, timeSlot } = req.body;
    const userId = req.user.id;

    if (!tableId || !reservationDate || !timeSlot) {
      return res.status(400).json({ error: 'tableId, reservationDate, and timeSlot are required.' });
    }

    // Atomic transaction for lock acquisition
    const lockResult = db.transaction(() => {
      // 1. Check if already reserved
      const existingRes = db.get(
        `SELECT id FROM reservations 
         WHERE tableId = ? AND reservationDate = ? AND timeSlot = ? AND status != 'Cancelled'`,
        [tableId, reservationDate, timeSlot]
      );
      if (existingRes) {
        return { error: 'TABLE_ALREADY_RESERVED', message: 'This table has already been reserved for this slot.' };
      }

      // 2. Check if locked by another user
      const existingLock = db.get(
        `SELECT * FROM table_locks 
         WHERE tableId = ? AND reservationDate = ? AND timeSlot = ? 
         AND lockedByUserId != ? AND datetime(lockExpiresAt) > datetime('now')`,
        [tableId, reservationDate, timeSlot, userId]
      );
      if (existingLock) {
        return { error: 'TABLE_LOCKED', message: 'Table is currently on a 5-minute hold by another customer. Please choose another table.' };
      }

      // 3. Clear any existing lock this user had for this table/slot
      db.run(
        'DELETE FROM table_locks WHERE tableId = ? AND reservationDate = ? AND timeSlot = ? AND lockedByUserId = ?',
        [tableId, reservationDate, timeSlot, userId]
      );

      // 4. Create 5-minute lock (CURRENT_TIMESTAMP + 5 minutes)
      const lockRes = db.run(
        `INSERT INTO table_locks (tableId, lockedByUserId, reservationDate, timeSlot, lockExpiresAt) 
         VALUES (?, ?, ?, ?, datetime('now', '+5 minutes'))`,
        [tableId, userId, reservationDate, timeSlot]
      );

      const insertedLock = db.get('SELECT * FROM table_locks WHERE id = ?', [lockRes.lastInsertRowid]);
      return { success: true, lock: insertedLock };
    });

    if (lockResult.error) {
      return res.status(409).json({ error: lockResult.message });
    }

    broadcastEvent('table_locked', {
      tableId: Number(tableId),
      reservationDate,
      timeSlot,
      userId: Number(userId)
    });
    emitToAdmin('admin_stats_updated', { type: 'TABLE_LOCKED', tableId: Number(tableId) });

    return res.json({
      message: 'Temporary 5-minute lock acquired.',
      lock: lockResult.lock
    });
  } catch (err) {
    console.error('acquireLock error:', err);
    return res.status(500).json({ error: 'Failed to acquire table lock.' });
  }
};

exports.releaseLock = (req, res) => {
  try {
    const { tableId, reservationDate, timeSlot } = req.body;
    const userId = req.user.id;

    db.run(
      'DELETE FROM table_locks WHERE tableId = ? AND reservationDate = ? AND timeSlot = ? AND lockedByUserId = ?',
      [tableId, reservationDate, timeSlot, userId]
    );

    broadcastEvent('table_unlocked', {
      tableId: Number(tableId),
      reservationDate,
      timeSlot
    });
    emitToAdmin('admin_stats_updated', { type: 'TABLE_UNLOCKED', tableId: Number(tableId) });

    return res.json({ message: 'Lock released successfully.' });
  } catch (err) {
    console.error('releaseLock error:', err);
    return res.status(500).json({ error: 'Failed to release lock.' });
  }
};

exports.bookTable = (req, res) => {
  try {
    cleanExpiredLocks();
    const { restaurantId, tableId, reservationDate, timeSlot, guestsCount = 2, specialRequests = '' } = req.body;
    const customerId = req.user.id;

    if (!restaurantId || !tableId || !reservationDate || !timeSlot) {
      return res.status(400).json({ error: 'Missing required reservation fields.' });
    }

    const bookingResult = db.transaction(() => {
      // 1. Verify not already reserved
      const existingRes = db.get(
        `SELECT id FROM reservations 
         WHERE tableId = ? AND reservationDate = ? AND timeSlot = ? AND status != 'Cancelled'`,
        [tableId, reservationDate, timeSlot]
      );
      if (existingRes) {
        return { error: 'TABLE_ALREADY_RESERVED', message: 'Table is already booked for this slot.' };
      }

      // 2. Check if locked by someone else
      const otherLock = db.get(
        `SELECT * FROM table_locks 
         WHERE tableId = ? AND reservationDate = ? AND timeSlot = ? 
         AND lockedByUserId != ? AND datetime(lockExpiresAt) > datetime('now')`,
        [tableId, reservationDate, timeSlot, customerId]
      );
      if (otherLock) {
        return { error: 'TABLE_LOCKED', message: 'Table hold expired or claimed by another user.' };
      }

      // 3. Create reservation in D1
      const resResult = db.run(
        `INSERT INTO reservations (customerId, restaurantId, tableId, reservationDate, timeSlot, guestsCount, status, specialRequests)
         VALUES (?, ?, ?, ?, ?, ?, 'Confirmed', ?)`,
        [customerId, restaurantId, tableId, reservationDate, timeSlot, guestsCount, specialRequests]
      );

      // 4. Release lock
      db.run('DELETE FROM table_locks WHERE tableId = ? AND reservationDate = ? AND timeSlot = ?', [
        tableId,
        reservationDate,
        timeSlot
      ]);

      const newReservation = db.get(
        `SELECT r.*, t.tableNumber, t.capacity, rest.name as restaurantName 
         FROM reservations r
         JOIN tables t ON r.tableId = t.id
         JOIN restaurants rest ON r.restaurantId = rest.id
         WHERE r.id = ?`,
        [resResult.lastInsertRowid]
      );

      // 5. Audit log
      db.run('INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)', [
        customerId,
        'TABLE_RESERVED',
        `Booked table ${newReservation.tableNumber} on ${reservationDate} at ${timeSlot}`
      ]);

      return { success: true, reservation: newReservation };
    });

    if (bookingResult.error) {
      return res.status(409).json({ error: bookingResult.message });
    }

    // Broadcast live event via Socket.IO
    broadcastEvent('table_reserved', bookingResult.reservation);
    emitToStaff('new_reservation', bookingResult.reservation);
    emitToAdmin('admin_stats_updated', { type: 'TABLE_RESERVED', reservation: bookingResult.reservation });

    return res.status(201).json({
      message: 'Reservation confirmed successfully.',
      reservation: bookingResult.reservation
    });
  } catch (err) {
    console.error('bookTable error:', err);
    return res.status(500).json({ error: 'Failed to confirm reservation.' });
  }
};

exports.cancelReservation = (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const resRecord = db.get('SELECT * FROM reservations WHERE id = ?', [id]);
    if (!resRecord) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    // Customers can only cancel their own reservations; Staff/Admin can cancel any
    if (userRole === 'Customer' && resRecord.customerId !== userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this reservation.' });
    }

    db.run("UPDATE reservations SET status = 'Cancelled' WHERE id = ?", [id]);

    db.run('INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)', [
      userId,
      'RESERVATION_CANCELLED',
      `Reservation #${id} was cancelled`
    ]);

    const cancelPayload = { id: Number(id), reservationId: Number(id), status: 'Cancelled' };
    broadcastEvent('reservation_cancelled', cancelPayload);
    emitToStaff('reservation_cancelled', cancelPayload);
    if (resRecord && resRecord.customerId) {
      emitToUser(resRecord.customerId, 'reservation_cancelled', cancelPayload);
    }
    emitToAdmin('admin_stats_updated', { type: 'RESERVATION_CANCELLED', id: Number(id) });

    return res.json({ message: 'Reservation cancelled successfully.' });
  } catch (err) {
    console.error('cancelReservation error:', err);
    return res.status(500).json({ error: 'Failed to cancel reservation.' });
  }
};

exports.getCustomerReservations = (req, res) => {
  try {
    const userId = req.user.id;
    const reservations = db.all(
      `SELECT r.*, t.tableNumber, t.capacity, rest.name as restaurantName, rest.address as restaurantAddress
       FROM reservations r
       JOIN tables t ON r.tableId = t.id
       JOIN restaurants rest ON r.restaurantId = rest.id
       WHERE r.customerId = ?
       ORDER BY r.reservationDate DESC, r.timeSlot DESC`,
      [userId]
    );
    return res.json({ reservations });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch reservations.' });
  }
};

exports.getStaffReservations = (req, res) => {
  try {
    const { restaurantId } = req.query;
    let sql = `
      SELECT r.*, t.tableNumber, t.capacity, u.name as customerName, u.email as customerEmail
      FROM reservations r
      JOIN tables t ON r.tableId = t.id
      JOIN users u ON r.customerId = u.id
    `;
    const params = [];
    if (restaurantId) {
      sql += ' WHERE r.restaurantId = ?';
      params.push(restaurantId);
    }
    sql += ' ORDER BY r.reservationDate DESC, r.timeSlot DESC';

    const reservations = db.all(sql, params);
    return res.json({ reservations });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch reservations.' });
  }
};

exports.updateTableStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Available', 'Reserved', 'Occupied'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    db.run('UPDATE tables SET status = ? WHERE id = ?', [status, id]);
    const statusPayload = { tableId: Number(id), id: Number(id), status };
    broadcastEvent('table_status_updated', statusPayload);
    emitToStaff('table_status_updated', statusPayload);

    return res.json({ message: 'Table status updated.', tableId: id, status });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update table status.' });
  }
};
