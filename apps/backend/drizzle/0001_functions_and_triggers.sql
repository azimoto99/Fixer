-- ============================================================================
-- DATABASE FUNCTIONS AND TRIGGERS MIGRATION
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_worker_profiles_updated_at ON worker_profiles;
CREATE TRIGGER update_worker_profiles_updated_at 
    BEFORE UPDATE ON worker_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate distance between two points using Haversine formula
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DECIMAL(10,8),
    lng1 DECIMAL(11,8),
    lat2 DECIMAL(10,8),
    lng2 DECIMAL(11,8)
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    earth_radius CONSTANT DECIMAL := 6371; -- Earth's radius in kilometers
    dlat DECIMAL;
    dlng DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    -- Convert degrees to radians
    dlat := RADIANS(lat2 - lat1);
    dlng := RADIANS(lng2 - lng1);
    
    -- Haversine formula
    a := SIN(dlat/2) * SIN(dlat/2) + 
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * 
         SIN(dlng/2) * SIN(dlng/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    
    RETURN ROUND(earth_radius * c, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update worker rating average
CREATE OR REPLACE FUNCTION update_worker_rating(worker_user_id UUID)
RETURNS VOID AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    total_ratings INTEGER;
BEGIN
    -- Calculate average rating and count from completed jobs
    SELECT 
        COALESCE(AVG(worker_rating), 0),
        COUNT(worker_rating)
    INTO avg_rating, total_ratings
    FROM jobs 
    WHERE worker_id = worker_user_id 
    AND worker_rating IS NOT NULL 
    AND status = 'completed';
    
    -- Update worker profile
    UPDATE worker_profiles 
    SET 
        rating_average = avg_rating,
        rating_count = total_ratings,
        updated_at = NOW()
    WHERE user_id = worker_user_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update worker rating when job rating changes
CREATE OR REPLACE FUNCTION trigger_update_worker_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Update rating when worker_rating is added or changed
    IF (OLD.worker_rating IS DISTINCT FROM NEW.worker_rating) AND NEW.worker_id IS NOT NULL THEN
        PERFORM update_worker_rating(NEW.worker_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_worker_rating_trigger ON jobs;
CREATE TRIGGER update_worker_rating_trigger
    AFTER UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION trigger_update_worker_rating();

-- Function to validate job status transitions
CREATE OR REPLACE FUNCTION validate_job_status_transition(
    old_status job_status,
    new_status job_status
) RETURNS BOOLEAN AS $$
BEGIN
    -- Define valid status transitions
    CASE old_status
        WHEN 'open' THEN
            RETURN new_status IN ('assigned', 'cancelled');
        WHEN 'assigned' THEN
            RETURN new_status IN ('in_progress', 'cancelled');
        WHEN 'in_progress' THEN
            RETURN new_status IN ('completed', 'disputed', 'cancelled');
        WHEN 'completed' THEN
            RETURN new_status IN ('disputed'); -- Only allow dispute after completion
        WHEN 'cancelled' THEN
            RETURN FALSE; -- Cannot change from cancelled
        WHEN 'disputed' THEN
            RETURN new_status IN ('completed', 'cancelled'); -- Resolve dispute
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to enforce job status transitions
CREATE OR REPLACE FUNCTION enforce_job_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        IF NOT validate_job_status_transition(OLD.status, NEW.status) THEN
            RAISE EXCEPTION 'Invalid job status transition from % to %', OLD.status, NEW.status;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_job_status_transition_trigger ON jobs;
CREATE TRIGGER enforce_job_status_transition_trigger
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION enforce_job_status_transition();

-- Function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
    target_user_id UUID,
    notification_title TEXT,
    notification_message TEXT,
    notification_type notification_type,
    notification_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (target_user_id, notification_title, notification_message, notification_type, notification_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to search jobs within radius
CREATE OR REPLACE FUNCTION search_jobs_within_radius(
    search_lat DECIMAL(10,8),
    search_lng DECIMAL(11,8),
    radius_km INTEGER DEFAULT 25,
    job_category TEXT DEFAULT NULL,
    min_price DECIMAL(10,2) DEFAULT NULL,
    max_price DECIMAL(10,2) DEFAULT NULL
) RETURNS TABLE (
    job_id UUID,
    distance_km DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.id,
        calculate_distance_km(search_lat, search_lng, j.location_lat, j.location_lng) as distance
    FROM jobs j
    WHERE 
        j.status = 'open'
        AND calculate_distance_km(search_lat, search_lng, j.location_lat, j.location_lng) <= radius_km
        AND (job_category IS NULL OR j.category = job_category)
        AND (min_price IS NULL OR j.price >= min_price)
        AND (max_price IS NULL OR j.price <= max_price)
    ORDER BY distance;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND read = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
