const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
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

// Middleware to validate user authentication
const validateAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const authToken = req.headers['authorization'];
  
  if (!userId || !authToken) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_MISSING'
    });
  }
  
  // In production, validate the Firebase token here
  if (process.env.NODE_ENV === 'production') {
    // TODO: Implement Firebase Admin SDK token verification
    // const admin = require('firebase-admin');
    // await admin.auth().verifyIdToken(authToken);
  }
  
  req.userId = userId;
  next();
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
const visionRoutes = require('./routes/vision');
const integrationRoutes = require('./routes/integrations');
const analyticsRoutes = require('./routes/analytics');

// Apply authentication to protected routes
app.use('/api/ai', validateAuth, aiLimiter, cacheMiddleware(180), aiRoutes);
app.use('/api/music', validateAuth, musicLimiter, cacheMiddleware(3600), musicRoutes);
app.use('/api/vision', validateAuth, aiLimiter, cacheMiddleware(60), visionRoutes);
app.use('/api/integrations', validateAuth, integrationRoutes);
app.use('/api/analytics', validateAuth, analyticsRoutes);

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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Zeeky AI Backend Server running on port ${PORT}`);
  console.log(`🔒 Security: ${process.env.NODE_ENV === 'production' ? 'Production' : 'Development'} mode`);
  console.log(`📊 Cache: TTL ${cache.options.stdTTL}s, Check period ${cache.options.checkperiod}s`);
});

module.exports = app;