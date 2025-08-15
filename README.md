# social media metrics tracker (only insta for now) -- TO DO: implement Insta API, switch DB from SQLite to Postgre (prolly SupaBase)

Future - use webscraping instead of insta and tiktok apis

## Features

### For Marketing Interns

- Submit Instagram post URLs for tracking
- View personal post analytics (likes, comments, reach, engagement rate)
- Delete own posts
- Simple, intuitive interface

### For Administrators

- **Analytics Overview**: Dashboard with summary statistics and top-performing posts
- **Posts Management**: View all team posts with detailed analytics
- **Team Management**: Add/remove team members, manage user roles
- **Analytics Refresh**: Update analytics data for individual posts or all posts at once
- **User Management**: Create intern and admin accounts

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone and setup the project:**

   ```bash
   git clone <repository-url>
   cd AnalyticsTracker
   npm run install:all
   ```

2. **Configure environment variables:**

   ```bash
   cd backend
   cp config.example.env .env
   ```

   Edit `.env` with your configuration:

   ```env
   PORT=5000
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ADMIN_EMAIL=admin@yourcompany.com
   ADMIN_PASSWORD=admin123
   ```

3. **Initialize the database:**

   ```bash
   cd backend
   npm run init-db
   ```

4. **Start the development servers:**

   ```bash
   # From the root directory
   npm run dev
   ```

   This will start:

   - Backend server on http://localhost:5000
   - Frontend app on http://localhost:3000

## Default Login Credentials

**Admin Account:**

- Email: `admin@company.com` (or whatever you set in .env)
- Password: `admin123` (or whatever you set in .env)

## Usage Guide

### For Interns

1. **Login** with credentials provided by your admin
2. **Submit Posts**: Enter Instagram post URLs in the format:
   ```
   https://www.instagram.com/p/ABC123def456/
   ```
3. **View Analytics**: See likes, comments, reach, and engagement rate for your posts
4. **Manage Posts**: Delete posts you no longer want to track

### For Administrators

1. **Analytics Overview**:

   - View total statistics across all posts
   - See top-performing posts ranked by engagement rate
   - Refresh all analytics with one click

2. **Posts Management**:

   - View all posts submitted by team members
   - Refresh individual post analytics
   - Delete any post

3. **Team Management**:
   - Add new team members (interns or admins)
   - Delete team members
   - View team roster with roles

## Instagram API Integration

Currently, the app uses mock data for demonstration purposes. To integrate with real Instagram data:

1. **Create Instagram App**:

   - Go to [Facebook for Developers](https://developers.facebook.com/)
   - Create a new app and add Instagram Basic Display product

2. **Configure OAuth**:

   - Set up redirect URIs
   - Get App ID and App Secret

3. **Update Environment Variables**:

   ```env
   INSTAGRAM_APP_ID=your-app-id
   INSTAGRAM_APP_SECRET=your-app-secret
   INSTAGRAM_REDIRECT_URI=http://localhost:3000/auth/instagram/callback
   ```

4. **Implement Real API Calls**:
   The code in `backend/services/instagram.js` contains comments showing how to implement real Instagram API integration.

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create new user (admin only)
- `GET /api/auth/profile` - Get current user profile
- `GET /api/auth/users` - List all users (admin only)
- `DELETE /api/auth/users/:id` - Delete user (admin only)

### Posts

- `POST /api/posts/submit` - Submit Instagram post URL
- `GET /api/posts/my-posts` - Get current user's posts
- `GET /api/posts/all` - Get all posts (admin only)
- `GET /api/posts/:id` - Get specific post (admin only)
- `DELETE /api/posts/:id` - Delete post

### Analytics

- `POST /api/analytics/refresh/:postId` - Refresh specific post analytics (admin only)
- `POST /api/analytics/refresh-all` - Refresh all posts analytics (admin only)
- `GET /api/analytics/summary` - Get analytics summary (admin only)
- `GET /api/analytics/user/:userId` - Get user-specific analytics (admin only)

## Database Schema

The app uses SQLite with three main tables: (SWITCH THIS TO SUPABASE OR SMTH FOR PROD)

- **users**: User accounts with roles (admin/intern)
- **instagram_posts**: Instagram post URLs and metadata
- **analytics**: Analytics data for each post (likes, comments, reach, etc.)

## Development Scripts

```bash
# Install all dependencies
npm run install:all

# Start both frontend and backend in development mode
npm run dev

# Start only backend
npm run backend:dev

# Start only frontend
npm run frontend:dev

# Build frontend for production
npm run build

# Start production server
npm start

# Initialize database (backend only)
cd backend && npm run init-db
```

## Security Features

- JWT token authentication with 24-hour expiration
- Password hashing with bcryptjs
- Rate limiting (100 requests per 15 minutes per IP)
- CORS protection
- Helmet security headers
- SQL injection protection with parameterized queries
- Role-based access control

## Production Deployment

1. **Environment Setup**:

   - Set `NODE_ENV=production`
   - Use a strong `JWT_SECRET`
   - Configure proper CORS origins
   - Use PostgreSQL instead of SQLite for production

2. **Build Frontend**:

   ```bash
   npm run build
   ```

3. **Deploy**:
   - Backend can be deployed to services like Heroku, DigitalOcean, or AWS
   - Frontend build can be served statically or deployed to Netlify/Vercel
   - Configure proper environment variables on your hosting platform

## License

MIT License - see LICENSE file for details.

