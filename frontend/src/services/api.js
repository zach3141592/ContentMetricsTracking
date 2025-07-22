import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  getUsers: () => api.get('/auth/users'),
  deleteUser: (userId) => api.delete(`/auth/users/${userId}`),
};

// Posts API
export const postsAPI = {
  submit: (instagramUrl) => api.post('/posts/submit', { instagramUrl }),
  getMyPosts: () => api.get('/posts/my-posts'),
  getAllPosts: () => api.get('/posts/all'),
  getPost: (postId) => api.get(`/posts/${postId}`),
  deletePost: (postId) => api.delete(`/posts/${postId}`),
};

// Analytics API
export const analyticsAPI = {
  refreshPost: (postId) => api.post(`/analytics/refresh/${postId}`),
  refreshAll: () => api.post('/analytics/refresh-all'),
  getSummary: () => api.get('/analytics/summary'),
  getUserAnalytics: (userId) => api.get(`/analytics/user/${userId}`),
};

export default api; 