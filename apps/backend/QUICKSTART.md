# Backend Quick Start Guide

This guide will help you get the Fixer backend up and running quickly.

## 🚀 Quick Setup

### 1. Prerequisites

- Node.js 18+ and npm 9+
- Supabase account and project
- PostgreSQL database (via Supabase)

### 2. Environment Setup

1. **Copy environment template:**
   ```bash
   cd apps/backend
   cp .env.example .env
   ```

2. **Configure your `.env` file:**
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

### 3. Install Dependencies

```bash
npm install
```

### 4. Initialize Database

```bash
# Initialize database with complete schema
npm run db:init

# Verify everything is working
npm run db:verify
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## 🔧 Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:init` | Initialize database with schema and functions |
| `npm run db:reset` | ⚠️ Reset database (deletes all data) |
| `npm run db:verify` | Verify database setup |
| `npm run db:generate` | Generate new migrations from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |

## 📊 Database Schema Overview

The database includes these main tables:

- **`users`** - User profiles (extends Supabase auth.users)
- **`worker_profiles`** - Extended worker information
- **`jobs`** - Job postings with location and pricing
- **`applications`** - Job applications from workers
- **`payments`** - Payment processing with Stripe
- **`notifications`** - System notifications

## 🔍 Verify Setup

### 1. Check API Health
```bash
curl http://localhost:3001/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy"
  }
}
```

### 2. Check Database Tables
```bash
npm run db:studio
```

This opens Drizzle Studio where you can explore the database schema.

### 3. Test Database Connection
```bash
npm run db:verify
```

## 🐛 Troubleshooting

### Database Connection Issues

1. **Check your DATABASE_URL format:**
   ```
   postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

2. **Verify Supabase project is active:**
   - Go to your Supabase dashboard
   - Check if the project is paused (free tier limitation)

3. **Check network connectivity:**
   ```bash
   # Test if you can reach Supabase
   ping db.[your-project-ref].supabase.co
   ```

### Migration Issues

1. **Reset and reinitialize:**
   ```bash
   npm run db:reset
   ```

2. **Check migration files:**
   ```bash
   ls -la drizzle/
   ```

### Environment Variable Issues

1. **Verify all required variables are set:**
   ```bash
   node -e "console.log(process.env.DATABASE_URL ? '✅ DATABASE_URL set' : '❌ DATABASE_URL missing')"
   ```

2. **Check for typos in variable names**

### Port Already in Use

```bash
# Kill process using port 3001
lsof -ti:3001 | xargs kill -9

# Or use a different port
PORT=3002 npm run dev
```

## 📚 Next Steps

1. **Explore the API:**
   - Health check: `GET /api/v1/health`
   - API documentation will be available at `/api/v1/docs` (coming soon)

2. **Database Management:**
   - Use Drizzle Studio to explore data: `npm run db:studio`
   - Check the full database documentation: [`DATABASE.md`](DATABASE.md)

3. **Development:**
   - API routes will be in `src/routes/`
   - Database queries are in `src/db/index.ts`
   - Middleware is in `src/middleware/`

## 🆘 Getting Help

- Check the full documentation: [`DATABASE.md`](DATABASE.md)
- Review the schema: [`src/db/schema.ts`](src/db/schema.ts)
- Examine example queries: [`src/db/index.ts`](src/db/index.ts)

## ✅ Success Checklist

- [ ] Environment variables configured
- [ ] Database connection successful
- [ ] All tables created
- [ ] Database functions working
- [ ] API server starts without errors
- [ ] Health check returns "healthy"
- [ ] Drizzle Studio opens successfully

Once all items are checked, your backend is ready for development! 🎉
