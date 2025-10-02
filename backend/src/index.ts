import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';
import { Redis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import casesRoutes from './routes/cases';
import salesRoutes from './routes/sales';
import billingRoutes from './routes/billing';
import settingsRoutes from './routes/settings';
import { createServer } from 'http';
import { setupSSE } from './utils/sse';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Create HTTP server for SSE support
const server = createServer(app);
setupSSE(server);

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Initialize Redis
    const redis = Redis.getInstance();
    await redis.connect();
    console.log('✅ Redis connected');

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  server.close(() => {
    console.log('HTTP server closed');
  });

  await AppDataSource.destroy();
  console.log('Database connection closed');
  
  const redis = Redis.getInstance();
  await redis.disconnect();
  console.log('Redis connection closed');
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  
  server.close(() => {
    console.log('HTTP server closed');
  });

  await AppDataSource.destroy();
  console.log('Database connection closed');
  
  const redis = Redis.getInstance();
  await redis.disconnect();
  console.log('Redis connection closed');
  
  process.exit(0);
});

// Start the server
startServer();