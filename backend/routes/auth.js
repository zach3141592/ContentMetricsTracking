const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { getDatabase } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Register new user (admin only)
router.post('/register', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, role, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!['admin', 'intern'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const db = getDatabase();

    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existingUser) => {
      if (err) {
        console.error('Database error:', err);
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingUser) {
        db.close();
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      db.run(
        'INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
        [email, hashedPassword, role, firstName, lastName],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            db.close();
            return res.status(500).json({ error: 'Failed to create user' });
          }

          db.close();
          res.status(201).json({
            message: 'User created successfully',
            user: {
              id: this.lastID,
              email,
              role,
              firstName,
              lastName
            }
          });
        }
      );
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDatabase();

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        db.close();
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        db.close();
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      db.close();

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, (req, res) => {
  const db = getDatabase();

  db.get('SELECT id, email, role, first_name, last_name, created_at FROM users WHERE id = ?', 
    [req.user.userId], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      db.close();
      return res.status(404).json({ error: 'User not found' });
    }

    db.close();
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at
      }
    });
  });
});

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  const db = getDatabase();

  db.all('SELECT id, email, role, first_name, last_name, created_at FROM users ORDER BY created_at DESC', 
    (err, users) => {
    if (err) {
      console.error('Database error:', err);
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }

    db.close();
    res.json({
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at
      }))
    });
  });
});

// Delete user (admin only)
router.delete('/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);

  if (userId === req.user.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const db = getDatabase();

  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      console.error('Database error:', err);
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      db.close();
      return res.status(404).json({ error: 'User not found' });
    }

    db.close();
    res.json({ message: 'User deleted successfully' });
  });
});

module.exports = router; 