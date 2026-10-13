const db = require('../db');

exports.getReviews = (req, res) => {
  try {
    const { restaurantId } = req.query;
    let sql = `
      SELECT r.*, u.name as customerName 
      FROM reviews r
      JOIN users u ON r.customerId = u.id
      WHERE r.isHidden = 0
    `;
    const params = [];
    if (restaurantId) {
      sql += ' AND r.restaurantId = ?';
      params.push(restaurantId);
    }
    sql += ' ORDER BY r.created_at DESC';

    const reviews = db.all(sql, params);
    return res.json({ reviews });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
};

exports.addReview = (req, res) => {
  try {
    const customerId = req.user.id;
    const { restaurantId, rating, comment } = req.body;

    if (!restaurantId || !rating || !comment) {
      return res.status(400).json({ error: 'restaurantId, rating (1-5), and comment are required.' });
    }

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    const result = db.run(
      'INSERT INTO reviews (customerId, restaurantId, rating, comment) VALUES (?, ?, ?, ?)',
      [customerId, restaurantId, numRating, comment.trim()]
    );

    const inserted = db.get(
      'SELECT r.*, u.name as customerName FROM reviews r JOIN users u ON r.customerId = u.id WHERE r.id = ?',
      [result.lastInsertRowid]
    );

    return res.status(201).json({ message: 'Review submitted.', review: inserted });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to submit review.' });
  }
};

exports.flagReview = (req, res) => {
  try {
    const { id } = req.params;
    db.run('UPDATE reviews SET isFlagged = 1 WHERE id = ?', [id]);

    db.run('INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)', [
      req.user ? req.user.id : null,
      'REVIEW_FLAGGED',
      `Review #${id} flagged for moderation review`
    ]);

    return res.json({ message: 'Review reported to moderation queue.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to flag review.' });
  }
};

exports.getModeratorQueue = (req, res) => {
  try {
    const flaggedReviews = db.all(
      `SELECT r.*, u.name as customerName, u.email as customerEmail, rest.name as restaurantName
       FROM reviews r
       JOIN users u ON r.customerId = u.id
       JOIN restaurants rest ON r.restaurantId = rest.id
       WHERE r.isFlagged = 1 OR r.isHidden = 1
       ORDER BY r.isFlagged DESC, r.created_at DESC`
    );

    const allReviews = db.all(
      `SELECT r.*, u.name as customerName, rest.name as restaurantName
       FROM reviews r
       JOIN users u ON r.customerId = u.id
       JOIN restaurants rest ON r.restaurantId = rest.id
       ORDER BY r.created_at DESC LIMIT 30`
    );

    return res.json({ flaggedReviews, allReviews });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch moderator queue.' });
  }
};

exports.resolveReviewFlag = (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'dismiss_flag', 'hide_review', 'delete_review'

    if (action === 'dismiss_flag') {
      db.run('UPDATE reviews SET isFlagged = 0, isHidden = 0 WHERE id = ?', [id]);
    } else if (action === 'hide_review') {
      db.run('UPDATE reviews SET isFlagged = 0, isHidden = 1 WHERE id = ?', [id]);
    } else if (action === 'delete_review') {
      db.run('DELETE FROM reviews WHERE id = ?', [id]);
    } else {
      return res.status(400).json({ error: 'Invalid action.' });
    }

    db.run('INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)', [
      req.user.id,
      'MODERATION_ACTION',
      `Review #${id} resolved with action '${action}' by Moderator ${req.user.name}`
    ]);

    return res.json({ message: `Review action '${action}' applied successfully.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to resolve review.' });
  }
};
