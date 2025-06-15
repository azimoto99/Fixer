#!/usr/bin/env tsx

/**
 * Simple database initialization script
 * This script creates the database schema using Drizzle migrations
 */

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
import path from 'path';

async function initDatabase() {
  console.log('🚀 Initializing database...');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Run Drizzle migrations
    console.log('📦 Running database migrations...');
    const migrationsFolder = path.join(__dirname, '../../drizzle');
    await migrate(db, { migrationsFolder });

    // Create essential functions
    console.log('⚙️ Creating database functions...');
    await createDatabaseFunctions();

    // Verify setup
    console.log('✅ Verifying database setup...');
    await verifySetup();

    console.log('🎉 Database initialization completed successfully!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
}

async function createDatabaseFunctions() {
  try {
    // Create updated_at trigger function
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create distance calculation function
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION calculate_distance_km(
          lat1 DECIMAL(10,8),
          lng1 DECIMAL(11,8),
          lat2 DECIMAL(10,8),
          lng2 DECIMAL(11,8)
      ) RETURNS DECIMAL(10,2) AS $$
      DECLARE
          earth_radius CONSTANT DECIMAL := 6371;
          dlat DECIMAL;
          dlng DECIMAL;
          a DECIMAL;
          c DECIMAL;
      BEGIN
          dlat := RADIANS(lat2 - lat1);
          dlng := RADIANS(lng2 - lng1);
          
          a := SIN(dlat/2) * SIN(dlat/2) + 
               COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * 
               SIN(dlng/2) * SIN(dlng/2);
          c := 2 * ATAN2(SQRT(a), SQRT(1-a));
          
          RETURN ROUND(earth_radius * c, 2);
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // Apply triggers to tables
    const tables = ['users', 'worker_profiles', 'jobs', 'payments'];
    for (const table of tables) {
      await db.execute(sql.raw(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at 
            BEFORE UPDATE ON ${table} 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `));
    }

    console.log('✅ Database functions created successfully');

  } catch (error) {
    console.error('❌ Failed to create database functions:', error);
    throw error;
  }
}

async function verifySetup() {
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

async function resetDatabase() {
  console.log('⚠️ RESETTING DATABASE - ALL DATA WILL BE LOST!');
  
  try {
    // Drop all tables in reverse dependency order
    const dropCommands = [
      'DROP TABLE IF EXISTS notifications CASCADE',
      'DROP TABLE IF EXISTS payments CASCADE',
      'DROP TABLE IF EXISTS applications CASCADE',
      'DROP TABLE IF EXISTS jobs CASCADE',
      'DROP TABLE IF EXISTS worker_profiles CASCADE',
      'DROP TABLE IF EXISTS users CASCADE',
      'DROP TYPE IF EXISTS notification_type CASCADE',
      'DROP TYPE IF EXISTS payment_status CASCADE',
      'DROP TYPE IF EXISTS application_status CASCADE',
      'DROP TYPE IF EXISTS urgency_level CASCADE',
      'DROP TYPE IF EXISTS job_status CASCADE',
      'DROP TYPE IF EXISTS price_type_enum CASCADE',
      'DROP TYPE IF EXISTS stripe_status CASCADE',
      'DROP TYPE IF EXISTS user_role CASCADE',
      'DROP FUNCTION IF EXISTS calculate_distance_km CASCADE',
      'DROP FUNCTION IF EXISTS update_updated_at_column CASCADE'
    ];

    for (const command of dropCommands) {
      await db.execute(sql.raw(command));
    }

    console.log('✅ Database reset completed');

  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'init':
  case 'setup':
    initDatabase();
    break;
  case 'reset':
    resetDatabase().then(() => initDatabase());
    break;
  case 'verify':
    testDatabaseConnection()
      .then(() => verifySetup())
      .then(() => closeDatabaseConnection());
    break;
  default:
    console.log(`
Usage: npm run db:init [command]

Commands:
  init    - Initialize database with schema and functions
  setup   - Alias for init
  reset   - Reset database and initialize from scratch (WARNING: deletes all data)
  verify  - Verify database setup

Examples:
  npm run db:init
  npm run db:init reset
  npm run db:init verify
    `);
    process.exit(1);
}
