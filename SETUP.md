# Fixer Ecosystem Setup Guide

Quick setup guide to get the Fixer ecosystem running locally.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# From the root directory
npm install
```

### 2. Environment Configuration

```bash
# Backend environment
cp apps/backend/.env.example apps/backend/.env

# Frontend environments
cp apps/fixer-post/.env.example apps/fixer-post/.env
cp apps/fixer-work/.env.example apps/fixer-work/.env
```

### 3. Generate Secure Secrets

```bash
# Generate secure JWT and session secrets
npm run generate:secrets
```

Copy the generated secrets to your `.env` file.

### 4. Configure Environment Variables

Edit `apps/backend/.env` with your Supabase credentials:

```bash
# Database (from your Supabase project settings)
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Supabase (from your project API settings)
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT (generate a secure secret)
JWT_SECRET=your-super-secure-jwt-secret-here

# Stripe (from your Stripe dashboard)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Application
NODE_ENV=development
PORT=3001
API_VERSION=v1
```

Edit frontend `.env` files with your public keys:

```bash
# apps/fixer-post/.env and apps/fixer-work/.env
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-publishable-key
```

### 5. Initialize Database

```bash
# From the root directory (recommended)
npm run db:init

# Or from the backend directory
cd apps/backend
npm run db:init
```

### 6. Verify Setup

```bash
# Test database setup
npm run db:verify

# Test all database operations
npm run test:db
```

### 7. Start Development Servers

```bash
# Start all applications (backend + both frontends)
npm run dev

# Or start individually
npm run dev:backend  # Backend API on http://localhost:3001
npm run dev:post     # Job posters app on http://localhost:5173
npm run dev:work     # Workers app on http://localhost:5174
```

## 📋 Available Commands

### Root Directory Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all applications |
| `npm run build` | Build all applications |
| `npm run db:init` | Initialize database |
| `npm run db:verify` | Verify database setup |
| `npm run db:reset` | Reset database (⚠️ deletes data) |
| `npm run test:db` | Test database operations |
| `npm run db:studio` | Open database GUI |
| `npm run generate:secrets` | Generate secure JWT/session secrets |

### Backend-Specific Commands

```bash
cd apps/backend

# Database management
npm run db:init          # Initialize database
npm run db:setup         # Alternative setup command
npm run db:reset         # Reset database
npm run db:verify        # Verify setup
npm run db:generate      # Generate migrations
npm run db:migrate       # Apply migrations
npm run db:studio        # Open Drizzle Studio
npm run test:db          # Test database

# Development
npm run dev              # Start backend server
npm run build            # Build for production
npm run test             # Run tests
```

## 🔍 Verification Steps

### 1. Check API Health

```bash
curl http://localhost:3001/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "services": {
    "database": "healthy"
  }
}
```

### 2. Check Frontend Apps

- **Job Posters App**: http://localhost:5173
- **Workers App**: http://localhost:5174

### 3. Check Database

```bash
# Open database GUI
npm run db:studio
```

## 🐛 Troubleshooting

### Database Connection Issues

1. **Verify Supabase credentials in `.env`**
2. **Check if Supabase project is active** (free tier may pause)
3. **Test connection manually:**
   ```bash
   npm run db:verify
   ```

### Port Already in Use

```bash
# Kill processes on ports
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Fixer Post
lsof -ti:5174 | xargs kill -9  # Fixer Work
```

### Environment Variable Issues

```bash
# Check if variables are loaded
cd apps/backend
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing')"
```

### Migration Issues

```bash
# Reset and reinitialize
npm run db:reset
```

## 📁 Project Structure

```
fixer/
├── apps/
│   ├── backend/           # Node.js API (port 3001)
│   ├── fixer-post/        # Job posters app (port 5173)
│   └── fixer-work/        # Workers app (port 5174)
├── packages/
│   └── shared/            # Shared types and utilities
└── package.json           # Root workspace
```

## ✅ Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured
- [ ] Database initialized (`npm run db:init`)
- [ ] Database verified (`npm run db:verify`)
- [ ] Backend starts without errors (`npm run dev:backend`)
- [ ] Frontend apps load successfully
- [ ] API health check returns "healthy"

## 🆘 Getting Help

- **Backend issues**: Check [`apps/backend/QUICKSTART.md`](apps/backend/QUICKSTART.md)
- **Database issues**: Check [`apps/backend/DATABASE.md`](apps/backend/DATABASE.md)
- **Full documentation**: Check [`README.md`](README.md)

Once all checklist items are complete, your Fixer ecosystem is ready for development! 🎉
