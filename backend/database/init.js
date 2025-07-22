const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../database.sqlite');

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    // Create tables
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'intern',
        first_name TEXT,
        last_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Instagram posts table
      db.run(`CREATE TABLE IF NOT EXISTS instagram_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        instagram_url TEXT NOT NULL,
        instagram_post_id TEXT,
        caption TEXT,
        media_type TEXT,
        media_url TEXT,
        permalink TEXT,
        timestamp DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);

      // Analytics table
      db.run(`CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        shares_count INTEGER DEFAULT 0,
        reach INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        saved_count INTEGER DEFAULT 0,
        engagement_rate REAL DEFAULT 0,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES instagram_posts (id)
      )`);

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON instagram_posts(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_post_id ON analytics(post_id)`);

      // Create default admin user
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@company.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      
      bcrypt.hash(adminPassword, 10, (err, hash) => {
        if (err) {
          console.error('Error hashing admin password:', err);
          reject(err);
          return;
        }

        db.run(`INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name) 
                VALUES (?, ?, 'admin', 'Admin', 'User')`, 
                [adminEmail, hash], function(err) {
          if (err) {
            console.error('Error creating admin user:', err);
            reject(err);
            return;
          }
          
          if (this.changes > 0) {
            console.log('Default admin user created:', adminEmail);
          }
          
          db.close((err) => {
            if (err) {
              console.error('Error closing database:', err);
              reject(err);
            } else {
              console.log('Database initialization completed');
              resolve();
            }
          });
        });
      });
    });
  });
}

function getDatabase() {
  return new sqlite3.Database(DB_PATH);
}

module.exports = {
  initializeDatabase,
  getDatabase,
  DB_PATH
}; 