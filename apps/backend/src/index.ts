import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import {
  config,
  isDevelopment,
  testDatabaseConnection,
  testSupabaseConnection,
  testStripeConnection,
  closeDatabaseConnection,
  checkDatabaseHealth
} from './config';

import {
  corsOptions,
  helmetOptions,
  compressionOptions,
  generalRateLimit,
  errorHandler,
  notFoundHandler,
  requestLogger,
  healthCheckBypass,
  sanitizeInput,
} from './middleware';

// Import routes (will be created later)
// import authRoutes from './routes/auth';
// import userRoutes from './routes/users';
// import jobRoutes from './routes/jobs';
// import applicationRoutes from './routes/applications';
// import paymentRoutes from './routes/payments';
// import reviewRoutes from './routes/reviews';
// import fileRoutes from './routes/files';

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Health check bypass (before other middleware)
app.use(healthCheckBypass);

// Security middleware
app.use(helmet(helmetOptions));
app.use(cors(corsOptions));

// Rate limiting
app.use(generalRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression
app.use(compression(compressionOptions));

// Logging
if (config.ENABLE_MORGAN_LOGGING) {
  app.use(morgan(config.LOG_FORMAT));
}

// Custom request logging
if (isDevelopment) {
  app.use(requestLogger);
}

// Input sanitization
app.use(sanitizeInput);

// API routes
const apiRouter = express.Router();

// Health check endpoint
apiRouter.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();

    res.json({
      status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbHealth.status,
        stripe: 'healthy', // TODO: Add Stripe health check
        supabase: 'healthy', // TODO: Add Supabase health check
      },
      details: {
        database: dbHealth.details,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Mount API routes (will be uncommented when routes are created)
// apiRouter.use('/auth', authRoutes);
// apiRouter.use('/users', userRoutes);
// apiRouter.use('/jobs', jobRoutes);
// apiRouter.use('/applications', applicationRoutes);
// apiRouter.use('/payments', paymentRoutes);
// apiRouter.use('/reviews', reviewRoutes);
// apiRouter.use('/files', fileRoutes);

// Mount API router
app.use(`/api/${config.API_VERSION}`, apiRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fixer API Server',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    docs: isDevelopment ? `/api/${config.API_VERSION}/docs` : undefined,
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handler
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database connections
    await closeDatabaseConnection();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Fixer API Server...');
    
    // Test connections
    console.log('🔍 Testing connections...');
    
    const dbConnected = await testDatabaseConnection();
    const supabaseConnected = await testSupabaseConnection();
    const stripeConnected = await testStripeConnection();
    
    if (!dbConnected || !supabaseConnected || !stripeConnected) {
      console.error('❌ Some services are not available. Server may not function properly.');
      if (!isDevelopment) {
        process.exit(1);
      }
    }
    
    // Start listening
    const server = app.listen(config.PORT, () => {
      console.log(`✅ Server running on port ${config.PORT}`);
      console.log(`📍 Environment: ${config.NODE_ENV}`);
      console.log(`🌐 API Base URL: http://localhost:${config.PORT}/api/${config.API_VERSION}`);
      
      if (isDevelopment) {
        console.log(`📚 Health Check: http://localhost:${config.PORT}/api/${config.API_VERSION}/health`);
        console.log(`🔧 Debug mode: ${config.DEBUG ? 'enabled' : 'disabled'}`);
      }
    });
    
    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${config.PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
