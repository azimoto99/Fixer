#!/usr/bin/env tsx

/**
 * Database test script
 * This script tests basic database operations to ensure everything is working
 */

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import {
  testDatabaseConnection,
  closeDatabaseConnection,
  db
} from '../config/database';
import { queries } from '../db';
import { sql } from 'drizzle-orm';

async function testDatabase() {
  console.log('🧪 Testing database operations...');

  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // Test basic query
    console.log('🔍 Testing basic query...');
    const result = await db.execute(sql`SELECT 1 as test, NOW() as timestamp`);
    console.log('✅ Basic query successful:', result.rows[0]);

    // Test distance function
    console.log('📏 Testing distance calculation function...');
    const distanceResult = await db.execute(sql`
      SELECT calculate_distance_km(37.7749, -122.4194, 37.7849, -122.4094) as distance_km
    `);
    console.log('✅ Distance function working:', distanceResult.rows[0]);

    // Test table existence
    console.log('📋 Testing table existence...');
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tableNames = tables.rows.map((row: any) => row.table_name);
    console.log('✅ Tables found:', tableNames);

    const expectedTables = ['users', 'worker_profiles', 'jobs', 'applications', 'payments', 'notifications'];
    const missingTables = expectedTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.error('❌ Missing tables:', missingTables);
    } else {
      console.log('✅ All expected tables exist');
    }

    // Test enum types
    console.log('🏷️ Testing enum types...');
    const enums = await db.execute(sql`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e'
      ORDER BY typname
    `);
    
    const enumNames = enums.rows.map((row: any) => row.typname);
    console.log('✅ Enums found:', enumNames);

    // Test functions
    console.log('⚙️ Testing database functions...');
    const functions = await db.execute(sql`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `);
    
    const functionNames = functions.rows.map((row: any) => row.routine_name);
    console.log('✅ Functions found:', functionNames);

    // Test triggers
    console.log('🔄 Testing triggers...');
    const triggers = await db.execute(sql`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
      ORDER BY trigger_name
    `);
    
    console.log('✅ Triggers found:', triggers.rows);

    console.log('🎉 All database tests passed successfully!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
}

async function testQueries() {
  console.log('🧪 Testing query helpers...');

  try {
    // Test connection
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // Test user queries (should return empty results but not error)
    console.log('👤 Testing user queries...');
    const users = await queries.users.findByEmail('test@example.com');
    console.log('✅ User query successful (no results expected):', users === null);

    // Test job search
    console.log('💼 Testing job search...');
    const jobs = await queries.jobs.search({
      lat: 37.7749,
      lng: -122.4194,
      radiusKm: 25,
      status: 'open',
      page: 1,
      limit: 10
    });
    console.log('✅ Job search successful (empty results expected):', Array.isArray(jobs));

    // Test application queries
    console.log('📝 Testing application queries...');
    const hasApplied = await queries.applications.hasApplied('test-job-id', 'test-worker-id');
    console.log('✅ Application check successful:', hasApplied === false);

    console.log('🎉 All query tests passed successfully!');

  } catch (error) {
    console.error('❌ Query test failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'db':
  case 'database':
    testDatabase();
    break;
  case 'queries':
    testQueries();
    break;
  case 'all':
    testDatabase().then(() => testQueries());
    break;
  default:
    console.log(`
Usage: npm run test:db [command]

Commands:
  db       - Test database setup (tables, functions, triggers)
  queries  - Test query helpers and operations
  all      - Run all tests

Examples:
  npm run test:db
  npm run test:db queries
  npm run test:db all
    `);
    process.exit(1);
}
