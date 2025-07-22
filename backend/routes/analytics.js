const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { fetchInstagramInsights } = require('../services/instagram');

const router = express.Router();

// Refresh analytics for a specific post (admin only)
router.post('/refresh/:postId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);

    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const db = getDatabase();

    // Check if post exists
    db.get('SELECT * FROM instagram_posts WHERE id = ?', [postId], async (err, post) => {
      if (err) {
        console.error('Database error:', err);
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      if (!post) {
        db.close();
        return res.status(404).json({ error: 'Post not found' });
      }

      try {
        // Fetch fresh analytics data
        const insights = await fetchInstagramInsights(post.instagram_post_id);

        if (!insights) {
          db.close();
          return res.status(500).json({ error: 'Failed to fetch analytics data' });
        }

        // Check if analytics record exists
        db.get('SELECT id FROM analytics WHERE post_id = ?', [postId], (err, existingAnalytics) => {
          if (err) {
            console.error('Database error:', err);
            db.close();
            return res.status(500).json({ error: 'Database error' });
          }

          if (existingAnalytics) {
            // Update existing analytics
            db.run(
              `UPDATE analytics 
               SET likes_count = ?, comments_count = ?, shares_count = ?, reach = ?, 
                   impressions = ?, saved_count = ?, engagement_rate = ?, fetched_at = CURRENT_TIMESTAMP
               WHERE post_id = ?`,
              [insights.likes_count, insights.comments_count, insights.shares_count, 
               insights.reach, insights.impressions, insights.saved_count, 
               insights.engagement_rate, postId],
              function(updateErr) {
                if (updateErr) {
                  console.error('Database error:', updateErr);
                  db.close();
                  return res.status(500).json({ error: 'Failed to update analytics' });
                }

                db.close();
                res.json({
                  message: 'Analytics updated successfully',
                  analytics: insights
                });
              }
            );
          } else {
            // Create new analytics record
            db.run(
              `INSERT INTO analytics (post_id, likes_count, comments_count, shares_count, 
                                    reach, impressions, saved_count, engagement_rate)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [postId, insights.likes_count, insights.comments_count, insights.shares_count,
               insights.reach, insights.impressions, insights.saved_count, insights.engagement_rate],
              function(insertErr) {
                if (insertErr) {
                  console.error('Database error:', insertErr);
                  db.close();
                  return res.status(500).json({ error: 'Failed to save analytics' });
                }

                db.close();
                res.json({
                  message: 'Analytics created successfully',
                  analytics: { id: this.lastID, ...insights }
                });
              }
            );
          }
        });
      } catch (fetchError) {
        console.error('Error fetching insights:', fetchError);
        db.close();
        res.status(500).json({ error: 'Failed to fetch analytics from Instagram' });
      }
    });
  } catch (error) {
    console.error('Analytics refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh analytics for all posts (admin only)
router.post('/refresh-all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDatabase();

    db.all('SELECT id, instagram_post_id FROM instagram_posts', async (err, posts) => {
      if (err) {
        console.error('Database error:', err);
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      if (posts.length === 0) {
        db.close();
        return res.json({ message: 'No posts to refresh', updated: 0 });
      }

      let updated = 0;
      let errors = 0;

      // Process posts sequentially to avoid overwhelming the API
      for (const post of posts) {
        try {
          const insights = await fetchInstagramInsights(post.instagram_post_id);
          
          if (insights) {
            // Update or insert analytics
            await new Promise((resolve, reject) => {
              db.run(
                `INSERT OR REPLACE INTO analytics 
                 (post_id, likes_count, comments_count, shares_count, reach, 
                  impressions, saved_count, engagement_rate, fetched_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [post.id, insights.likes_count, insights.comments_count, insights.shares_count,
                 insights.reach, insights.impressions, insights.saved_count, insights.engagement_rate],
                function(updateErr) {
                  if (updateErr) {
                    console.error(`Error updating analytics for post ${post.id}:`, updateErr);
                    errors++;
                    reject(updateErr);
                  } else {
                    updated++;
                    resolve();
                  }
                }
              );
            });
          } else {
            errors++;
          }

          // Add delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (postError) {
          console.error(`Error processing post ${post.id}:`, postError);
          errors++;
        }
      }

      db.close();
      res.json({
        message: 'Bulk analytics refresh completed',
        updated,
        errors,
        total: posts.length
      });
    });
  } catch (error) {
    console.error('Bulk analytics refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get analytics summary (admin only)
router.get('/summary', authenticateToken, requireAdmin, (req, res) => {
  const db = getDatabase();

  db.all(
    `SELECT 
       COUNT(*) as total_posts,
       AVG(a.likes_count) as avg_likes,
       AVG(a.comments_count) as avg_comments,
       AVG(a.reach) as avg_reach,
       AVG(a.impressions) as avg_impressions,
       AVG(a.engagement_rate) as avg_engagement_rate,
       SUM(a.likes_count) as total_likes,
       SUM(a.comments_count) as total_comments,
       SUM(a.reach) as total_reach,
       SUM(a.impressions) as total_impressions
     FROM instagram_posts p
     LEFT JOIN analytics a ON p.id = a.post_id`,
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      const summary = results[0];

      // Get top performing posts
      db.all(
        `SELECT p.instagram_url, p.caption, a.likes_count, a.comments_count, 
                a.reach, a.engagement_rate, u.first_name, u.last_name
         FROM instagram_posts p
         JOIN analytics a ON p.id = a.post_id
         JOIN users u ON p.user_id = u.id
         ORDER BY a.engagement_rate DESC
         LIMIT 5`,
        (topErr, topPosts) => {
          if (topErr) {
            console.error('Database error:', topErr);
            db.close();
            return res.status(500).json({ error: 'Database error' });
          }

          db.close();
          res.json({
            summary: {
              totalPosts: summary.total_posts || 0,
              averageLikes: Math.round(summary.avg_likes || 0),
              averageComments: Math.round(summary.avg_comments || 0),
              averageReach: Math.round(summary.avg_reach || 0),
              averageImpressions: Math.round(summary.avg_impressions || 0),
              averageEngagementRate: Number((summary.avg_engagement_rate || 0).toFixed(2)),
              totalLikes: summary.total_likes || 0,
              totalComments: summary.total_comments || 0,
              totalReach: summary.total_reach || 0,
              totalImpressions: summary.total_impressions || 0
            },
            topPosts
          });
        }
      );
    }
  );
});

// Get analytics for a specific user's posts (admin only)
router.get('/user/:userId', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.userId);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const db = getDatabase();

  db.all(
    `SELECT p.id, p.instagram_url, p.caption, p.created_at,
            a.likes_count, a.comments_count, a.shares_count, a.reach,
            a.impressions, a.saved_count, a.engagement_rate, a.fetched_at
     FROM instagram_posts p
     LEFT JOIN analytics a ON p.id = a.post_id
     WHERE p.user_id = ?
     ORDER BY p.created_at DESC`,
    [userId],
    (err, posts) => {
      if (err) {
        console.error('Database error:', err);
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      // Calculate user summary
      const postsWithAnalytics = posts.filter(post => post.likes_count !== null);
      const summary = {
        totalPosts: posts.length,
        postsWithAnalytics: postsWithAnalytics.length,
        averageLikes: postsWithAnalytics.length > 0 ? 
          Math.round(postsWithAnalytics.reduce((sum, post) => sum + (post.likes_count || 0), 0) / postsWithAnalytics.length) : 0,
        averageEngagementRate: postsWithAnalytics.length > 0 ?
          Number((postsWithAnalytics.reduce((sum, post) => sum + (post.engagement_rate || 0), 0) / postsWithAnalytics.length).toFixed(2)) : 0
      };

      db.close();
      res.json({
        posts,
        summary
      });
    }
  );
});

module.exports = router; 