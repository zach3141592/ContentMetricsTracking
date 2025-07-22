const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');

// Verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = decoded;
    next();
  });
}

// Check if user has admin role
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Check if user has intern or admin role
function requireInternOrAdmin(req, res, next) {
  if (!['intern', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
}

// Middleware to load full user data from database
function loadUserData(req, res, next) {
  const db = getDatabase();
  
  db.get('SELECT id, email, role, first_name, last_name FROM users WHERE id = ?', 
    [req.user.userId], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = { ...req.user, ...user };
    db.close();
    next();
  });
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireInternOrAdmin,
  loadUserData
}; 