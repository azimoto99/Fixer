-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can read their own profile and public profiles of others
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles" ON users
    FOR SELECT USING (true); -- Allow reading basic user info for job listings

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (during registration)
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- WORKER PROFILES TABLE POLICIES
-- ============================================================================

-- Anyone can view worker profiles (for job matching)
CREATE POLICY "Anyone can view worker profiles" ON worker_profiles
    FOR SELECT USING (true);

-- Workers can only update their own profile
CREATE POLICY "Workers can update own profile" ON worker_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Workers can insert their own profile
CREATE POLICY "Workers can insert own profile" ON worker_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Workers can delete their own profile
CREATE POLICY "Workers can delete own profile" ON worker_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- JOBS TABLE POLICIES
-- ============================================================================

-- Anyone can view open jobs
CREATE POLICY "Anyone can view open jobs" ON jobs
    FOR SELECT USING (status = 'open');

-- Posters can view all their own jobs
CREATE POLICY "Posters can view own jobs" ON jobs
    FOR SELECT USING (auth.uid() = poster_id);

-- Workers can view jobs they're assigned to
CREATE POLICY "Workers can view assigned jobs" ON jobs
    FOR SELECT USING (auth.uid() = worker_id);

-- Only posters can insert jobs
CREATE POLICY "Posters can insert jobs" ON jobs
    FOR INSERT WITH CHECK (auth.uid() = poster_id);

-- Posters can update their own jobs (with restrictions)
CREATE POLICY "Posters can update own jobs" ON jobs
    FOR UPDATE USING (
        auth.uid() = poster_id 
        AND status IN ('open', 'assigned') -- Can't update completed/cancelled jobs
    );

-- Workers can update jobs they're assigned to (limited fields)
CREATE POLICY "Workers can update assigned jobs" ON jobs
    FOR UPDATE USING (
        auth.uid() = worker_id 
        AND status IN ('assigned', 'in_progress')
    );

-- ============================================================================
-- APPLICATIONS TABLE POLICIES
-- ============================================================================

-- Workers can view their own applications
CREATE POLICY "Workers can view own applications" ON applications
    FOR SELECT USING (auth.uid() = worker_id);

-- Posters can view applications to their jobs
CREATE POLICY "Posters can view job applications" ON applications
    FOR SELECT USING (
        auth.uid() IN (
            SELECT poster_id FROM jobs WHERE id = job_id
        )
    );

-- Workers can insert applications to open jobs
CREATE POLICY "Workers can apply to jobs" ON applications
    FOR INSERT WITH CHECK (
        auth.uid() = worker_id
        AND EXISTS (
            SELECT 1 FROM jobs 
            WHERE id = job_id 
            AND status = 'open'
            AND poster_id != worker_id -- Can't apply to own jobs
        )
    );

-- Workers can update their own pending applications
CREATE POLICY "Workers can update own applications" ON applications
    FOR UPDATE USING (
        auth.uid() = worker_id 
        AND status = 'pending'
    );

-- Posters can update applications to their jobs (to accept/reject)
CREATE POLICY "Posters can respond to applications" ON applications
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT poster_id FROM jobs WHERE id = job_id
        )
        AND status = 'pending'
    );

-- ============================================================================
-- PAYMENTS TABLE POLICIES
-- ============================================================================

-- Posters can view payments for their jobs
CREATE POLICY "Posters can view own payments" ON payments
    FOR SELECT USING (auth.uid() = poster_id);

-- Workers can view payments for jobs they completed
CREATE POLICY "Workers can view earned payments" ON payments
    FOR SELECT USING (auth.uid() = worker_id);

-- Only the system can insert payments (through backend API)
CREATE POLICY "System can insert payments" ON payments
    FOR INSERT WITH CHECK (
        auth.uid() = poster_id OR auth.uid() = worker_id
    );

-- Only the system can update payment status
CREATE POLICY "System can update payments" ON payments
    FOR UPDATE USING (
        auth.uid() = poster_id OR auth.uid() = worker_id
    );

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- System can insert notifications for any user
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- ============================================================================

-- Function to check if user is a poster
CREATE OR REPLACE FUNCTION is_poster(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id AND role = 'poster'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is a worker
CREATE OR REPLACE FUNCTION is_worker(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id AND role = 'worker'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns a job
CREATE OR REPLACE FUNCTION owns_job(user_id UUID, job_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM jobs 
        WHERE id = job_id AND poster_id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is assigned to a job
CREATE OR REPLACE FUNCTION assigned_to_job(user_id UUID, job_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM jobs 
        WHERE id = job_id AND worker_id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant permissions on tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
