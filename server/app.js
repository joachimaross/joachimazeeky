const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import custom modules
const database = require('./models/database');
const ZeekyWebSocketServer = require('./websocket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize cache (TTL: 5 minutes)
const cache = new NodeCache({ stdTTL: 300 });

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      mediaSrc: ["'self'", "https:"],
      frameSrc: ["'self'", "https:"],
      workerSrc: ["'self'", "blob:"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID']
}));

// Rate limiting
const createRateLimit = (windowMs, maxRequests, message) => rateLimit({
  windowMs,
  max: maxRequests,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for development
    return process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1';
  }
});

// Different rate limits for different endpoints
const generalLimiter = createRateLimit(15 * 60 * 1000, 100, 'Too many requests, please try again later');
const aiLimiter = createRateLimit(1 * 60 * 1000, 20, 'AI request limit exceeded, please wait a minute');
const musicLimiter = createRateLimit(5 * 60 * 1000, 5, 'Music generation limit exceeded, please wait 5 minutes');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general rate limiting
app.use('/api/', generalLimiter);

// Enhanced authentication middleware with JWT support
const validateAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_MISSING'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await database.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Update last active timestamp
    await database.pgPool.query(
      'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    req.user = {
      userId: user.id,
      email: user.email,
      username: user.username,
      subscriptionTier: user.subscription_tier
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      error: 'Invalid token',
      code: 'AUTH_INVALID'
    });
  }
};

// Cache middleware
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    const key = `${req.method}:${req.originalUrl}:${req.userId || 'anonymous'}:${JSON.stringify(req.body)}`;
    const cached = cache.get(key);
    
    if (cached) {
      console.log(`Cache hit for: ${key}`);
      return res.json({ ...cached, cached: true });
    }
    
    res.sendResponse = res.json;
    res.json = (body) => {
      if (res.statusCode === 200 && !body.error) {
        cache.set(key, body, duration);
        console.log(`Cached response for: ${key}`);
      }
      res.sendResponse({ ...body, cached: false });
    };
    
    next();
  };
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: {
      keys: cache.keys().length,
      stats: cache.getStats()
    }
  });
});

// Import route modules
const aiRoutes = require('./routes/ai');
const musicRoutes = require('./routes/music');
const fileRoutes = require('./routes/files');
const voiceRoutes = require('./routes/voice');
const calendarRoutes = require('./routes/calendar');

// Apply authentication to protected routes
app.use('/api/ai', validateAuth, aiLimiter, cacheMiddleware(180), aiRoutes);
app.use('/api/music', validateAuth, musicLimiter, cacheMiddleware(3600), musicRoutes);
app.use('/api/files', validateAuth, fileRoutes);
app.use('/api/voice', validateAuth, voiceRoutes);
app.use('/api/calendar', validateAuth, calendarRoutes);

// Database health check endpoint
app.get('/api/health/database', async (req, res) => {
  try {
    const health = await database.healthCheck();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.userId,
    timestamp: new Date().toISOString()
  });

  // Don't leak internal errors in production
  const isDev = process.env.NODE_ENV === 'development';
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Invalid request data',
      details: isDev ? error.message : undefined,
      code: 'VALIDATION_ERROR'
    });
  }
  
  if (error.name === 'RateLimitError') {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: error.retryAfter,
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  if (error.status === 401) {
    return res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
  
  // Generic server error
  res.status(500).json({
    error: 'Internal server error',
    details: isDev ? error.message : 'Something went wrong',
    code: 'INTERNAL_ERROR',
    requestId: req.id || Date.now()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    code: 'NOT_FOUND'
  });
});

// Initialize WebSocket server
const wsServer = new ZeekyWebSocketServer(server);

// Start heartbeat for WebSocket connections
wsServer.startHeartbeat();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Close WebSocket connections
  wsServer.close();
  
  // Close database connections
  await database.close();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  wsServer.close();
  await database.close();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Zeeky AI Backend Server running on port ${PORT}`);
  console.log(`🔒 Security: ${process.env.NODE_ENV === 'production' ? 'Production' : 'Development'} mode`);
  console.log(`📊 Cache: TTL ${cache.options.stdTTL}s`);
  console.log(`🌐 WebSocket: Real-time communication enabled`);
  console.log(`💾 Database: PostgreSQL + Redis integration active`);
  console.log(`📁 File Processing: Multi-format support enabled`);
  console.log(`🎤 Voice Cloning: Advanced synthesis capabilities`);
});

module.exports = { app, server, wsServer, database };