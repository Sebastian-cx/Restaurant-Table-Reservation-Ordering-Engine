const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

exports.register = (req, res) => {
  try {
    const { name, email, password, role = 'Customer' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const validRoles = ['Customer', 'Staff', 'Admin', 'Moderator'];
    const assignedRole = validRoles.includes(role) ? role : 'Customer';

    const existing = db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const result = db.run(
      'INSERT INTO users (name, email, passwordHash, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), passwordHash, assignedRole]
    );

    const newUser = {
      id: Number(result.lastInsertRowid),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: assignedRole
    };

    // Log action
    db.run('INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)', [
      newUser.id,
      'USER_REGISTERED',
      `Registered user with role ${assignedRole}`
    ]);

    const token = createToken(newUser);
    return res.status(201).json({ user: newUser, token });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Failed to register account.' });
  }
};

exports.login = (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = bcrypt.compareSync(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = createToken(safeUser);
    return res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed.' });
  }
};

exports.quickLogin = (req, res) => {
  try {
    const { role } = req.params;
    const user = db.get('SELECT * FROM users WHERE role = ? ORDER BY id ASC LIMIT 1', [role]);
    if (!user) {
      return res.status(404).json({ error: `No seed user found for role ${role}.` });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = createToken(safeUser);
    return res.json({ user: safeUser, token });
  } catch (err) {
    console.error('QuickLogin error:', err);
    return res.status(500).json({ error: 'Quick login failed.' });
  }
};

// 1-Click instant login by email (for demo/testing — no password required)
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

exports.quickLoginByEmail = (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = db.get('SELECT id, name, email, role FROM users WHERE email = ?', [cleanEmail]);
    
    // If not found in DB, auto-create to ensure instant 1-click login always works
    if (!user) {
      const demoMeta = DEMO_USERS_MAP[cleanEmail] || {
        name: cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' '),
        role: 'Customer'
      };
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync('password123', salt);
      const result = db.run(
        'INSERT INTO users (name, email, passwordHash, role) VALUES (?, ?, ?, ?)',
        [demoMeta.name, cleanEmail, passwordHash, demoMeta.role]
      );
      user = {
        id: Number(result.lastInsertRowid),
        name: demoMeta.name,
        email: cleanEmail,
        role: demoMeta.role
      };
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = createToken(safeUser);
    return res.json({ user: safeUser, token });
  } catch (err) {
    console.error('QuickLoginByEmail error:', err);
    return res.status(500).json({ error: 'Quick login by email failed.' });
  }
};

exports.getMe = (req, res) => {
  try {
    const user = db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
};
