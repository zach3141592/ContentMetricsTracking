const express = require('express');
const validator = require('validator');
const { getDatabase } = require('../database/init');
const { authenticateToken, requireInternOrAdmin, requireAdmin } = require('../middleware/auth');
const { fetchInstagramPostData } = require('../services/instagram');

const router = express.Router();

// Submit Instagram post URL (intern or admin)
router.post('/submit', authenticateToken, requireInternOrAdmin, async (req, res) => {
  try {
    const { instagramUrl } = req.body;

    if (!instagramUrl) {
      return res.status(400).json({ error: 'Instagram URL is required' });
    }

    // Validate Instagram URL format
    const instagramUrlPattern = /^https:\/\/(www\.)?instagram\.com\/p\/[a-zA-Z0-9_-]+\/?/;
    if (!instagramUrlPattern.test(instagramUrl)) {
      return res.status(400).json({ error: 'Invalid Instagram post URL format' });
    }

    const db = getDatabase();

    // Check if URL already exists
    db.get('SELECT id FROM instagram_posts WHERE instagram_url = ?', [instagramUrl], async (err, existingPost) => {
      if (err) {
        console.error('Database error:', err);
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingPost) {
        db.close();
        return res.status(400).json({ error: 'This Instagram post has already been submitted' });
      }

      try {
        // Extract post ID from URL
        const postIdMatch = instagramUrl.match(/\/p\/([a-zA-Z0-9_-]+)/);
        const instagramPostId = postIdMatch ? postIdMatch[1] : null;

        // Initially save the post with URL only
        db.run(
          'INSERT INTO instagram_posts (user_id, instagram_url, instagram_post_id) VALUES (?, ?, ?)',
          [req.user.userId, instagramUrl, instagramPostId],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              db.close();
              return res.status(500).json({ error: 'Failed to save post' });
            }

            const postId = this.lastID;

            // Try to fetch initial post data (this will work once Instagram API is set up)
            fetchInstagramPostData(instagramUrl)
              .then(postData => {
                if (postData) {
                  // Update post with fetched data
                  db.run(
                    `UPDATE instagram_posts 
                     SET caption = ?, media_type = ?, media_url = ?, permalink = ?, timestamp = ?
                     WHERE id = ?`,
                    [postData.caption, postData.media_type, postData.media_url, 
                     postData.permalink, postData.timestamp, postId],
                    (updateErr) => {
                      if (updateErr) {
                        console.error('Error updating post data:', updateErr);
                      }
                      db.close();
                    }
                  );
                } else {
                  db.close();
                }
              })
              .catch(fetchError => {
                console.error('Error fetching Instagram data:', fetchError);
                db.close();
              });

            res.status(201).json({
              message: 'Instagram post submitted successfully',
              post: {
                id: postId,
                instagramUrl,
                instagramPostId,
                userId: req.user.userId
              }
            });
          }
        );
      } catch (error) {
        console.error('Error processing Instagram URL:', error);
        db.close();
        res.status(400).json({ error: 'Invalid Instagram URL' });
      }
    });
  } catch (error) {
    console.error('Post submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's own posts (intern or admin)
router.get('/my-posts', authenticateToken, requireInternOrAdmin, (req, res) => {
  const db = getDatabase();

  db.all(
    `SELECT p.*, a.likes_count, a.comments_count, a.shares_count, a.reach, a.impressions, 
            a.saved_count, a.engagement_rate, a.fetched_at
     FROM instagram_posts p
     LEFT JOIN analytics a ON p.id = a.post_id
     WHERE p.user_id = ?
     ORDER BY p.created_at DESC`,
    [req.user.userId],
    (err, posts) => {
      if (err) {
        console.error('Database error:', err);
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      db.close();
      res.json({ posts });
    }
  );
});

// Get all posts (admin only)
router.get('/all', authenticateToken, requireAdmin, (req, res) => {
  const db = getDatabase();

  db.all(
    `SELECT p.*, u.first_name, u.last_name, u.email,
            a.likes_count, a.comments_count, a.shares_count, a.reach, a.impressions,
            a.saved_count, a.engagement_rate, a.fetched_at
     FROM instagram_posts p
     LEFT JOIN users u ON p.user_id = u.id
     LEFT JOIN analytics a ON p.id = a.post_id
     ORDER BY p.created_at DESC`,
    (err, posts) => {
      if (err) {
        console.error('Database error:', err);
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      db.close();
      res.json({ posts });
    }
  );
});

// Get post by ID with analytics (admin only)
router.get('/:id', authenticateToken, requireAdmin, (req, res) => {
  const postId = parseInt(req.params.id);

  if (isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid post ID' });
  }

  const db = getDatabase();

  db.get(
    `SELECT p.*, u.first_name, u.last_name, u.email,
            a.likes_count, a.comments_count, a.shares_count, a.reach, a.impressions,
            a.saved_count, a.engagement_rate, a.fetched_at
     FROM instagram_posts p
     LEFT JOIN users u ON p.user_id = u.id
     LEFT JOIN analytics a ON p.id = a.post_id
     WHERE p.id = ?`,
    [postId],
    (err, post) => {
      if (err) {
        console.error('Database error:', err);
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      if (!post) {
        db.close();
        return res.status(404).json({ error: 'Post not found' });
      }

      db.close();
      res.json({ post });
    }
  );
});

// Delete post (admin only, or user can delete their own)
router.delete('/:id', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.id);

  if (isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid post ID' });
  }

  const db = getDatabase();

  // First check if post exists and user has permission
  db.get('SELECT user_id FROM instagram_posts WHERE id = ?', [postId], (err, post) => {
    if (err) {
      console.error('Database error:', err);
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }

    if (!post) {
      db.close();
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user owns the post or is admin
    if (post.user_id !== req.user.userId && req.user.role !== 'admin') {
      db.close();
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Delete analytics first (foreign key constraint)
    db.run('DELETE FROM analytics WHERE post_id = ?', [postId], (analyticsErr) => {
      if (analyticsErr) {
        console.error('Error deleting analytics:', analyticsErr);
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      // Delete the post
      db.run('DELETE FROM instagram_posts WHERE id = ?', [postId], function(postErr) {
        if (postErr) {
          console.error('Error deleting post:', postErr);
          db.close();
          return res.status(500).json({ error: 'Database error' });
        }

        db.close();
        res.json({ message: 'Post deleted successfully' });
      });
    });
  });
});

module.exports = router; 