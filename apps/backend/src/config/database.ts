import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config, isDevelopment } from './env';
import * as schema from '../db/schema';

// Validate database configuration
if (!config.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Parse connection string to extract components
const dbUrl = new URL(config.DATABASE_URL);
const isSSL = dbUrl.searchParams.get('sslmode') !== 'disable';

// Create postgres client with optimized connection pooling
const connectionConfig = {
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1),
  username: dbUrl.username,
  password: dbUrl.password,
  ssl: isSSL ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of connections in pool
  idle_timeout: 30, // Close idle connections after 30 seconds
  connect_timeout: 10, // Connection timeout in seconds
  max_lifetime: 60 * 30, // Maximum connection lifetime (30 minutes)
  prepare: false, // Disable prepared statements for better compatibility
  transform: {
    undefined: null, // Transform undefined to null
  },
  debug: isDevelopment, // Enable debug logging in development
};

// Create postgres client
const client = postgres(config.DATABASE_URL, connectionConfig);

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export client for direct queries if needed
export { client };

// Database connection test with detailed error reporting
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const result = await client`SELECT
      version() as version,
      current_database() as database,
      current_user as user,
      inet_server_addr() as server_addr,
      inet_server_port() as server_port`;

    console.log('✅ Database connection successful');
    if (isDevelopment) {
      console.log('📊 Database info:', {
        database: result[0].database,
        user: result[0].user,
        server: `${result[0].server_addr}:${result[0].server_port}`,
      });
    }
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Run database migrations
export async function runMigrations(): Promise<void> {
  try {
    console.log('🔄 Running database migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw error;
  }
}

// Database health check
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: Record<string, any>;
}> {
  try {
    const start = Date.now();
    await client`SELECT 1`;
    const responseTime = Date.now() - start;

    // Check connection pool status
    const poolStatus = {
      totalConnections: client.options.max,
      idleConnections: client.idle.length,
      activeConnections: client.reserved.length,
    };

    return {
      status: 'healthy',
      details: {
        responseTime: `${responseTime}ms`,
        pool: poolStatus,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return await db.transaction(callback);
}

// Graceful shutdown with connection cleanup
export async function closeDatabaseConnection(): Promise<void> {
  try {
    console.log('🔄 Closing database connections...');

    // Wait for active queries to complete (max 5 seconds)
    const timeout = setTimeout(() => {
      console.warn('⚠️ Force closing database connections due to timeout');
    }, 5000);

    await client.end({ timeout: 5 });
    clearTimeout(timeout);

    console.log('✅ Database connections closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
    throw error;
  }
}
