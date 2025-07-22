import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { postsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function InternDashboard() {
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [instagramUrl, setInstagramUrl] = useState('');

  useEffect(() => {
    fetchMyPosts();
  }, []);

  const fetchMyPosts = async () => {
    try {
      const response = await postsAPI.getMyPosts();
      setPosts(response.data.posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load your posts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!instagramUrl.trim()) {
      toast.error('Please enter an Instagram URL');
      return;
    }

    // Validate Instagram URL format
    const instagramUrlPattern = /^https:\/\/(www\.)?instagram\.com\/p\/[a-zA-Z0-9_-]+\/?/;
    if (!instagramUrlPattern.test(instagramUrl)) {
      toast.error('Please enter a valid Instagram post URL');
      return;
    }

    setSubmitting(true);

    try {
      const response = await postsAPI.submit(instagramUrl);
      toast.success('Instagram post submitted successfully!');
      setInstagramUrl('');
      
      // Add the new post to the list
      const newPost = response.data.post;
      setPosts(prevPosts => [newPost, ...prevPosts]);
    } catch (error) {
      console.error('Error submitting post:', error);
      toast.error(error.response?.data?.error || 'Failed to submit post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      await postsAPI.deletePost(postId);
      toast.success('Post deleted successfully');
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {user?.firstName}!
              </h1>
              <p className="text-gray-600">Submit your Instagram posts for analytics tracking</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Submit New Post */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Submit Instagram Post
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="flex gap-4">
              <div className="flex-1">
                <label htmlFor="instagram-url" className="sr-only">
                  Instagram Post URL
                </label>
                <input
                  type="url"
                  id="instagram-url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/ABC123..."
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={submitting}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter the full URL of your Instagram post
                </p>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>

        {/* My Posts */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Your Submitted Posts ({posts.length})
            </h2>
          </div>

          {posts.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-400 text-6xl mb-4">📱</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No posts submitted yet
              </h3>
              <p className="text-gray-600">
                Submit your first Instagram post to start tracking analytics!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {posts.map((post) => (
                <div key={post.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <a
                          href={post.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Post
                        </a>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-600">
                          Submitted {formatDistanceToNow(new Date(post.created_at))} ago
                        </span>
                      </div>
                      
                      {post.caption && (
                        <p className="mt-2 text-gray-600 text-sm line-clamp-2">
                          {post.caption}
                        </p>
                      )}

                      {/* Analytics Display */}
                      {post.likes_count !== null && (
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">
                              {post.likes_count || 0}
                            </div>
                            <div className="text-xs text-gray-600">Likes</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">
                              {post.comments_count || 0}
                            </div>
                            <div className="text-xs text-gray-600">Comments</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">
                              {post.reach || 0}
                            </div>
                            <div className="text-xs text-gray-600">Reach</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">
                              {post.engagement_rate ? `${post.engagement_rate.toFixed(1)}%` : '0%'}
                            </div>
                            <div className="text-xs text-gray-600">Engagement</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="ml-4 text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 