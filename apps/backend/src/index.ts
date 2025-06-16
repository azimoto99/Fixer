import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler } from './middleware/error';
import { generalRateLimit, requestLogger } from './middleware/security';

// Import route handlers
import authRoutes from './routes/auth';
import jobRoutes from './routes/jobs';
import applicationRoutes from './routes/applications';
import userRoutes from './routes/users';
import paymentRoutes from './routes/payments';
import enterpriseRoutes from './routes/enterprise';

const app = express();

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Request logging
app.use(requestLogger);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", config.SUPABASE_URL || ""],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173', // fixer-post dev
    'http://localhost:5174', // fixer-work dev  
    'http://localhost:3000', // alternative dev port
    ...config.CORS_ORIGINS.split(',').map(origin => origin.trim()),
  ].filter(Boolean),
  credentials: true,
}));

// Rate limiting
app.use(generalRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API documentation endpoint
app.get('/api', (_req, res) => {
  res.json({
    name: 'Fixer API',
    version: '1.0.0',
    description: 'Job marketplace API for connecting job posters with workers',
    endpoints: {
      auth: '/api/auth/*', 
      jobs: '/api/jobs/*',
      applications: '/api/applications/*',  
      users: '/api/users/*',
      payments: '/api/payments/*',
      enterprise: '/api/enterprise/*',
    },
    documentation: 'https://docs.fixer.app', 
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/enterprise', enterpriseRoutes);

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/auth',
      '/api/jobs', 
      '/api/applications',
      '/api/users',
      '/api/payments',
      '/api/enterprise'
    ]
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = config.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 Fixer API Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${config.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;
