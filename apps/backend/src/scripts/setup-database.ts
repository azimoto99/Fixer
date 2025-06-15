#!/usr/bin/env tsx

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { config } from '../config/env';
import {
  testDatabaseConnection,
  closeDatabaseConnection,
  db
} from '../config/database';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

/**
 * Database setup script
 * This script sets up the database with all necessary tables, functions, and RLS policies
 */

async function setupDatabase() {
  console.log('🚀 Starting database setup...');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Run Drizzle migrations
    console.log('📦 Running Drizzle migrations...');
    await migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle') });

    // Apply database functions and triggers
    console.log('⚙️ Setting up database functions and triggers...');
    const functionsPath = path.join(__dirname, '../db/functions.sql');
    if (fs.existsSync(functionsPath)) {
      const functionsSQL = fs.readFileSync(functionsPath, 'utf8');
      await db.execute(sql.raw(functionsSQL));
    } else {
      console.warn('⚠️ Functions SQL file not found, skipping...');
    }

    // Apply RLS policies
    console.log('🔒 Setting up Row Level Security policies...');
    const rlsPath = path.join(__dirname, '../db/rls-policies.sql');
    if (fs.existsSync(rlsPath)) {
      const rlsSQL = fs.readFileSync(rlsPath, 'utf8');
      await db.execute(sql.raw(rlsSQL));
    } else {
      console.warn('⚠️ RLS policies SQL file not found, skipping...');
    }

    // Verify setup
    console.log('✅ Verifying database setup...');
    await verifyDatabaseSetup();

    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
}

/**
 * Verify that all tables and functions are properly set up
 */
async function verifyDatabaseSetup() {
  try {
    // Check if all tables exist
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const expectedTables = [
      'users',
      'worker_profiles', 
      'jobs',
      'applications',
      'payments',
      'notifications'
    ];

    const existingTables = tables.rows.map((row: any) => row.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(', ')}`);
    }

    console.log(`✅ All ${expectedTables.length} tables created successfully`);

    // Check if functions exist
    const functions = await db.execute(sql`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `);

    const expectedFunctions = [
      'calculate_distance_km',
      'update_worker_rating',
      'validate_job_status_transition',
      'create_notification',
      'search_jobs_within_radius',
      'cleanup_old_notifications'
    ];

    const existingFunctions = functions.rows.map((row: any) => row.routine_name);
    const missingFunctions = expectedFunctions.filter(func => !existingFunctions.includes(func));

    if (missingFunctions.length > 0) {
      console.warn(`⚠️ Missing functions: ${missingFunctions.join(', ')}`);
    } else {
      console.log(`✅ All ${expectedFunctions.length} functions created successfully`);
    }

    // Check if RLS is enabled
    const rlsStatus = await db.execute(sql`
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = true
    `);

    console.log(`✅ RLS enabled on ${rlsStatus.rows.length} tables`);

    // Test a simple query
    const testQuery = await db.execute(sql`SELECT 1 as test`);
    if (testQuery.rows[0]?.test !== 1) {
      throw new Error('Database query test failed');
    }

    console.log('✅ Database verification completed successfully');

  } catch (error) {
    console.error('❌ Database verification failed:', error);
    throw error;
  }
}

/**
 * Reset database (WARNING: This will delete all data)
 */
async function resetDatabase() {
  console.log('⚠️ RESETTING DATABASE - ALL DATA WILL BE LOST!');
  
  try {
    // Drop all tables in reverse dependency order
    await db.execute(sql`DROP TABLE IF EXISTS notifications CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS payments CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS applications CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS jobs CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS worker_profiles CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);

    // Drop all custom types
    await db.execute(sql`DROP TYPE IF EXISTS notification_type CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS payment_status CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS application_status CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS urgency_level CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS job_status CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS price_type_enum CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS stripe_status CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS user_role CASCADE`);

    // Drop all functions
    await db.execute(sql`DROP FUNCTION IF EXISTS calculate_distance_km CASCADE`);
    await db.execute(sql`DROP FUNCTION IF EXISTS update_worker_rating CASCADE`);
    await db.execute(sql`DROP FUNCTION IF EXISTS validate_job_status_transition CASCADE`);
    await db.execute(sql`DROP FUNCTION IF EXISTS create_notification CASCADE`);
    await db.execute(sql`DROP FUNCTION IF EXISTS search_jobs_within_radius CASCADE`);
    await db.execute(sql`DROP FUNCTION IF EXISTS cleanup_old_notifications CASCADE`);
    await db.execute(sql`DROP FUNCTION IF EXISTS update_updated_at_column CASCADE`);

    console.log('✅ Database reset completed');

  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'setup':
    setupDatabase();
    break;
  case 'reset':
    resetDatabase().then(() => setupDatabase());
    break;
  case 'verify':
    testDatabaseConnection()
      .then(() => verifyDatabaseSetup())
      .then(() => closeDatabaseConnection());
    break;
  default:
    console.log(`
Usage: npm run db:setup [command]

Commands:
  setup   - Set up database with tables, functions, and RLS policies
  reset   - Reset database and set up from scratch (WARNING: deletes all data)
  verify  - Verify database setup

Examples:
  npm run db:setup setup
  npm run db:setup reset
  npm run db:setup verify
    `);
    process.exit(1);
}
