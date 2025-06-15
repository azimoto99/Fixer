# Fixer Backend Database Documentation

This document provides comprehensive information about the Fixer backend database setup, schema, and operations.

## 🏗️ Database Architecture

The Fixer backend uses **PostgreSQL** with **Supabase** as the hosting platform and **Drizzle ORM** for type-safe database operations.

### Key Features
- **Type-safe queries** with Drizzle ORM
- **Row Level Security (RLS)** for data protection
- **Automatic migrations** with Drizzle Kit
- **Real-time subscriptions** via Supabase
- **Comprehensive indexing** for performance
- **Database functions** for complex operations
- **Automatic triggers** for data consistency

## 📊 Database Schema

### Core Tables

#### 1. Users Table
Extends Supabase `auth.users` with application-specific data.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,              -- References auth.users(id)
  role user_role NOT NULL,          -- 'poster' | 'worker'
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Worker Profiles Table
Extended profile information for workers.

```sql
CREATE TABLE worker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id),
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  hourly_rate DECIMAL(10,2),
  service_radius_km INTEGER DEFAULT 25,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  stripe_account_id TEXT,
  stripe_account_status stripe_status DEFAULT 'not_connected',
  availability_schedule JSONB,
  is_available BOOLEAN DEFAULT true,
  rating_average DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. Jobs Table
Job postings with comprehensive details.

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id UUID REFERENCES users(id),
  worker_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  location_address TEXT NOT NULL,
  location_lat DECIMAL(10,8) NOT NULL,
  location_lng DECIMAL(11,8) NOT NULL,
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,
  price DECIMAL(10,2) NOT NULL,
  price_type price_type_enum NOT NULL,    -- 'fixed' | 'hourly'
  required_skills TEXT[] DEFAULT '{}',
  status job_status DEFAULT 'open',       -- 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
  urgency urgency_level DEFAULT 'normal', -- 'low' | 'normal' | 'high' | 'urgent'
  estimated_duration_hours INTEGER,
  scheduled_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  completion_notes TEXT,
  poster_rating INTEGER CHECK (poster_rating >= 1 AND poster_rating <= 5),
  worker_rating INTEGER CHECK (worker_rating >= 1 AND worker_rating <= 5),
  poster_review TEXT,
  worker_review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. Applications Table
Job applications from workers.

```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  worker_id UUID REFERENCES users(id),
  message TEXT,
  proposed_price DECIMAL(10,2),
  estimated_completion_time INTEGER,
  status application_status DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(job_id, worker_id)
);
```

#### 5. Payments Table
Payment processing and tracking.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  poster_id UUID REFERENCES users(id),
  worker_id UUID REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  worker_amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_transfer_id TEXT,
  payment_method_id TEXT,
  status payment_status DEFAULT 'pending', -- 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'disputed'
  authorized_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6. Notifications Table
System notifications for users.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 Database Functions

### Distance Calculation
```sql
calculate_distance_km(lat1, lng1, lat2, lng2) RETURNS DECIMAL(10,2)
```
Calculates distance between two geographic points using the Haversine formula.

### Worker Rating Management
```sql
update_worker_rating(worker_user_id UUID) RETURNS VOID
```
Automatically calculates and updates worker rating averages from completed jobs.

### Job Status Validation
```sql
validate_job_status_transition(old_status, new_status) RETURNS BOOLEAN
```
Validates job status transitions to ensure proper workflow.

### Job Search
```sql
search_jobs_within_radius(lat, lng, radius_km, category, min_price, max_price)
```
Searches for jobs within a specified radius with optional filters.

### Notification Creation
```sql
create_notification(user_id, title, message, type, data) RETURNS UUID
```
Creates system notifications for users.

## 🔒 Row Level Security (RLS)

### Security Policies

#### Users Table
- Users can read their own profile and public profiles of others
- Users can only update their own profile
- Users can insert their own profile during registration

#### Worker Profiles Table
- Anyone can view worker profiles (for job matching)
- Workers can only update/delete their own profile

#### Jobs Table
- Anyone can view open jobs
- Posters can view all their own jobs
- Workers can view jobs they're assigned to
- Only posters can create jobs
- Limited update permissions based on job status

#### Applications Table
- Workers can view their own applications
- Posters can view applications to their jobs
- Workers can apply to open jobs (except their own)
- Status updates restricted by role

#### Payments Table
- Posters can view payments for their jobs
- Workers can view payments for jobs they completed
- System-controlled insert/update operations

#### Notifications Table
- Users can only view/update their own notifications
- System can insert notifications for any user

## 🚀 Setup Instructions

### 1. Environment Configuration

Create `.env` file in the backend directory:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/fixer_db

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Set up database (creates tables, functions, RLS policies)
npm run db:setup setup

# Verify setup
npm run db:verify

# Generate migrations (if schema changes)
npm run db:generate

# Apply migrations
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### 3. Reset Database (Development Only)

```bash
# WARNING: This deletes all data
npm run db:reset
```

## 📝 Usage Examples

### Basic Queries

```typescript
import { queries } from '../db';

// Find user by ID
const user = await queries.users.findById('user-uuid');

// Search jobs within radius
const jobs = await queries.jobs.search({
  lat: 37.7749,
  lng: -122.4194,
  radiusKm: 25,
  category: 'plumbing',
  status: 'open'
});

// Create job application
const application = await queries.applications.create({
  jobId: 'job-uuid',
  workerId: 'worker-uuid',
  message: 'I can help with this job',
  proposedPrice: 150.00
});
```

### Transactions

```typescript
import { withTransaction } from '../config/database';

await withTransaction(async (tx) => {
  // Accept application
  await queries.applications.acceptApplication('app-uuid');
  
  // Create notification
  await queries.notifications.create({
    userId: 'worker-uuid',
    title: 'Application Accepted',
    message: 'Your application has been accepted!',
    type: 'application_accepted'
  });
});
```

## 🔍 Performance Optimization

### Indexes
- **Geographic indexes** on location columns for spatial queries
- **GIN indexes** on array columns (skills, required_skills)
- **Composite indexes** on frequently queried column combinations
- **Partial indexes** on status columns for active records

### Query Optimization
- Use `EXPLAIN ANALYZE` to analyze query performance
- Leverage database functions for complex calculations
- Implement proper pagination for large result sets
- Use connection pooling for concurrent requests

## 🛠️ Maintenance

### Regular Tasks
- Run `cleanup_old_notifications()` to remove old read notifications
- Monitor database performance and query execution times
- Update statistics with `ANALYZE` command
- Backup database regularly

### Monitoring
- Track slow queries
- Monitor connection pool usage
- Watch for RLS policy violations
- Check index usage statistics

## 🔄 Migration Strategy

### Schema Changes
1. Create migration with `npm run db:generate`
2. Review generated SQL
3. Test in development environment
4. Apply with `npm run db:migrate`
5. Verify with `npm run db:verify`

### Data Migrations
- Use TypeScript scripts in `src/scripts/` directory
- Implement rollback procedures
- Test with sample data
- Document migration steps

## 📚 Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
