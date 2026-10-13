const db = require('../db');
const { broadcastEvent } = require('../socket');

exports.getMenu = (req, res) => {
  try {
    const { restaurantId, category, onlyAvailable } = req.query;

    let sql = 'SELECT * FROM menu_items WHERE 1=1';
    const params = [];

    if (restaurantId) {
      sql += ' AND restaurantId = ?';
      params.push(restaurantId);
    }

    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (onlyAvailable === 'true') {
      sql += ' AND isAvailable = 1';
    }

    sql += ' ORDER BY category ASC, name ASC';

    const items = db.all(sql, params);
    return res.json({ items });
  } catch (err) {
    console.error('getMenu error:', err);
    return res.status(500).json({ error: 'Failed to fetch menu items.' });
  }
};

exports.addMenuItem = (req, res) => {
  try {
    const { restaurantId, name, description, price, category, dietaryTag = 'Veg', imageUrl = '' } = req.body;

    if (!restaurantId || !name || price === undefined || !category) {
      return res.status(400).json({ error: 'restaurantId, name, price, and category are required.' });
    }

    const result = db.run(
      `INSERT INTO menu_items (restaurantId, name, description, price, category, isAvailable, dietaryTag, imageUrl)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [restaurantId, name.trim(), description || '', price, category, dietaryTag, imageUrl]
    );

    const newItem = db.get('SELECT * FROM menu_items WHERE id = ?', [result.lastInsertRowid]);

    db.run('INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'MENU_ITEM_ADDED',
      `Added menu item: ${newItem.name} (₹${newItem.price})`
    ]);

    broadcastEvent('menu_updated', {
      action: 'added',
      restaurantId: newItem.restaurantId,
      item: newItem
    });

    return res.status(201).json({ message: 'Menu item created.', item: newItem });
  } catch (err) {
    console.error('addMenuItem error:', err);
    return res.status(500).json({ error: 'Failed to add menu item.' });
  }
};

exports.updateMenuItem = (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, isAvailable, dietaryTag, imageUrl } = req.body;

    const existing = db.get('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    db.run(
      `UPDATE menu_items 
       SET name = coalesce(?, name),
           description = coalesce(?, description),
           price = coalesce(?, price),
           category = coalesce(?, category),
           isAvailable = coalesce(?, isAvailable),
           dietaryTag = coalesce(?, dietaryTag),
           imageUrl = coalesce(?, imageUrl)
       WHERE id = ?`,
      [name, description, price, category, isAvailable, dietaryTag, imageUrl, id]
    );

    const updated = db.get('SELECT * FROM menu_items WHERE id = ?', [id]);

    broadcastEvent('menu_updated', {
      action: 'updated',
      restaurantId: updated.restaurantId,
      item: updated
    });

    return res.json({ message: 'Menu item updated.', item: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update menu item.' });
  }
};

exports.toggleAvailability = (req, res) => {
  try {
    const { id } = req.params;
    const item = db.get('SELECT isAvailable FROM menu_items WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    const newStatus = item.isAvailable ? 0 : 1;
    db.run('UPDATE menu_items SET isAvailable = ? WHERE id = ?', [newStatus, id]);

    broadcastEvent('menu_updated', {
      action: 'toggle',
      id: Number(id),
      isAvailable: newStatus
    });

    return res.json({ id, isAvailable: newStatus });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to toggle availability.' });
  }
};

exports.deleteMenuItem = (req, res) => {
  try {
    const { id } = req.params;
    db.run('DELETE FROM menu_items WHERE id = ?', [id]);

    broadcastEvent('menu_updated', {
      action: 'deleted',
      id: Number(id)
    });

    return res.json({ message: 'Menu item deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete menu item.' });
  }
};
