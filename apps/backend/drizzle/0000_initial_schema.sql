-- ============================================================================
-- INITIAL SCHEMA MIGRATION
-- ============================================================================

-- Create custom types/enums
DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('poster', 'worker');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "stripe_status" AS ENUM('not_connected', 'pending', 'verified', 'restricted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "price_type_enum" AS ENUM('fixed', 'hourly');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "job_status" AS ENUM('open', 'assigned', 'in_progress', 'completed', 'cancelled', 'disputed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "urgency_level" AS ENUM('low', 'normal', 'high', 'urgent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "application_status" AS ENUM('pending', 'accepted', 'rejected', 'withdrawn');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "payment_status" AS ENUM('pending', 'authorized', 'captured', 'failed', 'refunded', 'disputed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "notification_type" AS ENUM('job_posted', 'application_received', 'application_accepted', 'application_rejected', 'job_assigned', 'job_started', 'job_completed', 'payment_received', 'rating_received');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create tables
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "user_role" NOT NULL,
	"full_name" text NOT NULL,
	"avatar_url" text,
	"phone" text,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "worker_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" text,
	"skills" text[] DEFAULT '{}',
	"hourly_rate" numeric(10,2),
	"service_radius_km" integer DEFAULT 25,
	"location_lat" numeric(10,8),
	"location_lng" numeric(11,8),
	"stripe_account_id" text,
	"stripe_account_status" "stripe_status" DEFAULT 'not_connected',
	"availability_schedule" jsonb,
	"is_available" boolean DEFAULT true,
	"rating_average" numeric(3,2) DEFAULT '0',
	"rating_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "worker_profiles_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE IF NOT EXISTS "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poster_id" uuid NOT NULL,
	"worker_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"location_address" text NOT NULL,
	"location_lat" numeric(10,8) NOT NULL,
	"location_lng" numeric(11,8) NOT NULL,
	"location_city" text,
	"location_state" text,
	"location_zip" text,
	"price" numeric(10,2) NOT NULL,
	"price_type" "price_type_enum" NOT NULL,
	"required_skills" text[] DEFAULT '{}',
	"status" "job_status" DEFAULT 'open' NOT NULL,
	"urgency" "urgency_level" DEFAULT 'normal',
	"estimated_duration_hours" integer,
	"scheduled_start" timestamp with time zone,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"completion_notes" text,
	"poster_rating" integer,
	"worker_rating" integer,
	"poster_review" text,
	"worker_review" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poster_rating_check" CHECK ("poster_rating" >= 1 AND "poster_rating" <= 5),
	CONSTRAINT "worker_rating_check" CHECK ("worker_rating" >= 1 AND "worker_rating" <= 5)
);

CREATE TABLE IF NOT EXISTS "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"message" text,
	"proposed_price" numeric(10,2),
	"estimated_completion_time" integer,
	"status" "application_status" DEFAULT 'pending' NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"poster_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"amount" numeric(10,2) NOT NULL,
	"platform_fee" numeric(10,2) NOT NULL,
	"worker_amount" numeric(10,2) NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_transfer_id" text,
	"payment_method_id" text,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"authorized_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);

CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"data" jsonb,
	"read" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role");
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "idx_worker_profiles_user_id" ON "worker_profiles" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_worker_profiles_location" ON "worker_profiles" ("location_lat","location_lng");
CREATE INDEX IF NOT EXISTS "idx_worker_profiles_skills" ON "worker_profiles" USING gin ("skills");
CREATE INDEX IF NOT EXISTS "idx_jobs_poster_id" ON "jobs" ("poster_id");
CREATE INDEX IF NOT EXISTS "idx_jobs_worker_id" ON "jobs" ("worker_id");
CREATE INDEX IF NOT EXISTS "idx_jobs_status" ON "jobs" ("status");
CREATE INDEX IF NOT EXISTS "idx_jobs_location" ON "jobs" ("location_lat","location_lng");
CREATE INDEX IF NOT EXISTS "idx_jobs_category" ON "jobs" ("category");
CREATE INDEX IF NOT EXISTS "idx_jobs_skills" ON "jobs" USING gin ("required_skills");
CREATE INDEX IF NOT EXISTS "idx_jobs_created_at" ON "jobs" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_applications_job_id" ON "applications" ("job_id");
CREATE INDEX IF NOT EXISTS "idx_applications_worker_id" ON "applications" ("worker_id");
CREATE INDEX IF NOT EXISTS "idx_applications_status" ON "applications" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_job_worker" ON "applications" ("job_id","worker_id");
CREATE INDEX IF NOT EXISTS "idx_payments_job_id" ON "payments" ("job_id");
CREATE INDEX IF NOT EXISTS "idx_payments_poster_id" ON "payments" ("poster_id");
CREATE INDEX IF NOT EXISTS "idx_payments_worker_id" ON "payments" ("worker_id");
CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "payments" ("status");
CREATE INDEX IF NOT EXISTS "idx_payments_stripe_payment_intent" ON "payments" ("stripe_payment_intent_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_read" ON "notifications" ("read");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications" ("created_at" DESC);

-- Create foreign key constraints
DO $$ BEGIN
 ALTER TABLE "worker_profiles" ADD CONSTRAINT "worker_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "jobs" ADD CONSTRAINT "jobs_poster_id_users_id_fk" FOREIGN KEY ("poster_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "jobs" ADD CONSTRAINT "jobs_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_poster_id_users_id_fk" FOREIGN KEY ("poster_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
