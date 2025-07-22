import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { postsAPI, analyticsAPI, authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Analytics state
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  
  // Posts state
  const [posts, setPosts] = useState([]);
  
  // Users state
  const [users, setUsers] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'intern'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAnalyticsSummary(),
        fetchAllPosts(),
        fetchUsers()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsSummary = async () => {
    try {
      const response = await analyticsAPI.getSummary();
      setAnalyticsSummary(response.data);
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      toast.error('Failed to load analytics summary');
    }
  };

  const fetchAllPosts = async () => {
    try {
      const response = await postsAPI.getAllPosts();
      setPosts(response.data.posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await authAPI.getUsers();
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleRefreshAllAnalytics = async () => {
    setRefreshing(true);
    try {
      const response = await analyticsAPI.refreshAll();
      toast.success(`Analytics refreshed! Updated ${response.data.updated} posts`);
      await Promise.all([fetchAnalyticsSummary(), fetchAllPosts()]);
    } catch (error) {
      console.error('Error refreshing analytics:', error);
      toast.error('Failed to refresh analytics');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshPost = async (postId) => {
    try {
      await analyticsAPI.refreshPost(postId);
      toast.success('Post analytics refreshed!');
      await fetchAllPosts();
    } catch (error) {
      console.error('Error refreshing post analytics:', error);
      toast.error('Failed to refresh post analytics');
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await authAPI.register(newUser);
      if (response.data) {
        toast.success('User created successfully!');
        setShowUserForm(false);
        setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'intern' });
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await authAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
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
                Admin Dashboard
              </h1>
              <p className="text-gray-600">Welcome, {user?.firstName}! Manage your team's Instagram analytics</p>
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

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 pt-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'analytics', name: 'Analytics Overview' },
              { id: 'posts', name: 'All Posts' },
              { id: 'users', name: 'Team Management' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Analytics Overview Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Analytics Overview</h2>
              <button
                onClick={handleRefreshAllAnalytics}
                disabled={refreshing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {refreshing ? 'Refreshing...' : 'Refresh All Analytics'}
              </button>
            </div>

            {analyticsSummary && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-2xl font-bold text-gray-900">
                      {analyticsSummary.summary.totalPosts}
                    </div>
                    <div className="text-sm text-gray-600">Total Posts</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-2xl font-bold text-gray-900">
                      {analyticsSummary.summary.totalLikes.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Total Likes</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-2xl font-bold text-gray-900">
                      {analyticsSummary.summary.totalReach.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Total Reach</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-2xl font-bold text-gray-900">
                      {analyticsSummary.summary.averageEngagementRate}%
                    </div>
                    <div className="text-sm text-gray-600">Avg Engagement Rate</div>
                  </div>
                </div>

                {/* Top Performing Posts */}
                {analyticsSummary.topPosts.length > 0 && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Top Performing Posts</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {analyticsSummary.topPosts.map((post, index) => (
                        <div key={index} className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-blue-600">#{index + 1}</span>
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
                                  by {post.first_name} {post.last_name}
                                </span>
                              </div>
                              {post.caption && (
                                <p className="mt-1 text-gray-600 text-sm line-clamp-2">
                                  {post.caption}
                                </p>
                              )}
                            </div>
                            <div className="ml-4 text-right">
                              <div className="text-lg font-bold text-gray-900">
                                {post.engagement_rate.toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-600">Engagement Rate</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* All Posts Tab */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                All Posts ({posts.length})
              </h2>
            </div>

            <div className="bg-white shadow rounded-lg">
              {posts.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-gray-400 text-6xl mb-4">📱</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No posts submitted yet
                  </h3>
                  <p className="text-gray-600">
                    Posts submitted by your team will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {posts.map((post) => (
                    <div key={post.id} className="p-6">
                      <div className="flex justify-between items-start">
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
                              by {post.first_name} {post.last_name}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600">
                              {formatDistanceToNow(new Date(post.created_at))} ago
                            </span>
                          </div>
                          
                          {post.caption && (
                            <p className="mt-2 text-gray-600 text-sm line-clamp-2">
                              {post.caption}
                            </p>
                          )}

                          {/* Analytics Display */}
                          {post.likes_count !== null && (
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-4">
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
                                  {post.impressions || 0}
                                </div>
                                <div className="text-xs text-gray-600">Impressions</div>
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

                        <div className="ml-4 flex gap-2">
                          <button
                            onClick={() => handleRefreshPost(post.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Refresh
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Management Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                Team Management ({users.length})
              </h2>
              <button
                onClick={() => setShowUserForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Add Team Member
              </button>
            </div>

            {/* Add User Form */}
            {showUserForm && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Team Member</h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                      className="border-gray-300 rounded-md"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                      className="border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full border-gray-300 rounded-md"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full border-gray-300 rounded-md"
                    required
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="w-full border-gray-300 rounded-md"
                  >
                    <option value="intern">Intern</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Create User
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUserForm(false)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Users List */}
            <div className="bg-white shadow rounded-lg">
              <div className="divide-y divide-gray-200">
                {users.map((u) => (
                  <div key={u.id} className="p-6 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-sm text-gray-600">{u.email}</div>
                      <div className="text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          u.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {u.role}
                        </span>
                      </div>
                    </div>
                    {u.id !== user.id && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 