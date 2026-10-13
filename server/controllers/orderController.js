const db = require('../db');
const { broadcastEvent, emitToUser, emitToStaff, emitToAdmin, emitToOrder } = require('../socket');

exports.createOrder = (req, res) => {
  try {
    const customerId = req.user.id;
    const {
      restaurantId,
      orderType,
      tableId = null,
      deliveryAddress = '',
      items = [],
      totalAmount
    } = req.body;

    if (!restaurantId || !orderType || !items.length || totalAmount === undefined) {
      return res.status(400).json({ error: 'Missing required order fields or empty cart.' });
    }

    if (orderType === 'Delivery' && !deliveryAddress.trim()) {
      return res.status(400).json({ error: 'Delivery address is required for delivery orders.' });
    }

    const orderResult = db.transaction(() => {
      // 1. Insert into orders
      const orderInsert = db.run(
        `INSERT INTO orders (customerId, restaurantId, orderType, tableId, deliveryAddress, totalAmount, orderStatus)
         VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
        [customerId, restaurantId, orderType, tableId, deliveryAddress.trim(), totalAmount]
      );

      const orderId = Number(orderInsert.lastInsertRowid);

      // 2. Insert items
      for (const item of items) {
        db.run(
          `INSERT INTO order_items (orderId, menuItemId, name, price, quantity)
           VALUES (?, ?, ?, ?, ?)`,
          [orderId, item.menuItemId, item.name, item.price, item.quantity]
        );
      }

      // 3. Create initial pending payment record
      db.run(
        `INSERT INTO payments (orderId, amount, paymentStatus)
         VALUES (?, ?, 'Pending')`,
        [orderId, totalAmount]
      );

      // 4. Audit log
      db.run('INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)', [
        customerId,
        'ORDER_CREATED',
        `Placed ${orderType} order #${orderId} with total ₹${totalAmount}`
      ]);

      return orderId;
    });

    const fullOrder = getOrderWithDetails(orderResult);

    // Socket.IO real-time alerts
    broadcastEvent('order_created', fullOrder);
    emitToStaff('new_kitchen_order', fullOrder);
    emitToUser(customerId, 'order_status_sync', fullOrder);
    emitToAdmin('admin_stats_updated', { type: 'ORDER_CREATED', order: fullOrder });

    return res.status(201).json({
      message: 'Order placed successfully.',
      order: fullOrder
    });
  } catch (err) {
    console.error('createOrder error:', err);
    return res.status(500).json({ error: 'Failed to create order.' });
  }
};

exports.updateOrderStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    const validStatuses = ['Pending', 'Preparing', 'Out for Delivery', 'Served', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ error: 'Invalid order status.' });
    }

    const order = db.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    db.run('UPDATE orders SET orderStatus = ? WHERE id = ?', [orderStatus, id]);

    // Audit log
    db.run('INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'ORDER_STATUS_UPDATED',
      `Order #${id} status changed to ${orderStatus}`
    ]);

    const updatedOrder = getOrderWithDetails(id);

    const statusPayload = {
      orderId: Number(id),
      id: Number(id),
      orderStatus,
      order: updatedOrder,
      updatedOrder
    };

    // Push real-time event to customer, staff, and admin
    broadcastEvent('status_updated', statusPayload);
    emitToUser(order.customerId, 'order_status_updated', statusPayload);
    emitToStaff('order_status_updated', statusPayload);
    emitToOrder(Number(id), 'order_status_updated', statusPayload);
    emitToAdmin('admin_stats_updated', { type: 'ORDER_STATUS_UPDATED', orderId: Number(id), orderStatus });

    return res.json({
      message: `Order status updated to ${orderStatus}.`,
      order: updatedOrder
    });
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    return res.status(500).json({ error: 'Failed to update order status.' });
  }
};

exports.getCustomerOrders = (req, res) => {
  try {
    const customerId = req.user.id;
    const orders = db.all(
      `SELECT o.*, rest.name as restaurantName, t.tableNumber, p.paymentStatus, p.razorpayPaymentId
       FROM orders o
       JOIN restaurants rest ON o.restaurantId = rest.id
       LEFT JOIN tables t ON o.tableId = t.id
       LEFT JOIN payments p ON o.id = p.orderId
       WHERE o.customerId = ?
       ORDER BY o.created_at DESC`,
      [customerId]
    );

    const enriched = orders.map(ord => {
      const items = db.all('SELECT * FROM order_items WHERE orderId = ?', [ord.id]);
      return { ...ord, items };
    });

    return res.json({ orders: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch customer orders.' });
  }
};

exports.getKitchenOrders = (req, res) => {
  try {
    const { restaurantId, status } = req.query;
    let sql = `
      SELECT o.*, u.name as customerName, u.email as customerEmail, rest.name as restaurantName, 
             t.tableNumber, p.paymentStatus
      FROM orders o
      JOIN users u ON o.customerId = u.id
      JOIN restaurants rest ON o.restaurantId = rest.id
      LEFT JOIN tables t ON o.tableId = t.id
      LEFT JOIN payments p ON o.id = p.orderId
      WHERE 1=1
    `;
    const params = [];

    if (restaurantId) {
      sql += ' AND o.restaurantId = ?';
      params.push(restaurantId);
    }

    if (status && status !== 'All') {
      sql += ' AND o.orderStatus = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC';

    const orders = db.all(sql, params);
    const enriched = orders.map(ord => {
      const items = db.all('SELECT * FROM order_items WHERE orderId = ?', [ord.id]);
      return { ...ord, items };
    });

    return res.json({ orders: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch kitchen orders.' });
  }
};

exports.getOrderById = (req, res) => {
  try {
    const { id } = req.params;
    const order = getOrderWithDetails(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    return res.json({ order });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch order details.' });
  }
};

function getOrderWithDetails(orderId) {
  const order = db.get(
    `SELECT o.*, u.name as customerName, u.email as customerEmail, rest.name as restaurantName,
            t.tableNumber, p.paymentStatus, p.razorpayPaymentId
     FROM orders o
     JOIN users u ON o.customerId = u.id
     JOIN restaurants rest ON o.restaurantId = rest.id
     LEFT JOIN tables t ON o.tableId = t.id
     LEFT JOIN payments p ON o.id = p.orderId
     WHERE o.id = ?`,
    [orderId]
  );
  if (!order) return null;
  const items = db.all('SELECT * FROM order_items WHERE orderId = ?', [orderId]);
  return { ...order, items };
}
