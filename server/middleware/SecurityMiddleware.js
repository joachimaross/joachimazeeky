const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

class SecurityMiddleware {
  static setupSecurityHeaders(app) {
    // Content Security Policy
    const csp = {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-eval'", // Required for React development
          "'unsafe-inline'", // Required for some React features
          "https://cdn.jsdelivr.net",
          "https://unpkg.com",
          "https://www.google.com",
          "https://www.gstatic.com",
          "https://apis.google.com",
          "https://firebase.googleapis.com",
          "https://www.googleapis.com",
          "https://cdn.firebase.com",
          "https://firebaseapp.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for styled-components and CSS-in-JS
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdn.jsdelivr.net",
          "data:"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "http:", // Allow for development
          "https://firebasestorage.googleapis.com",
          "https://lh3.googleusercontent.com", // Google profile images
          "https://avatars.githubusercontent.com" // GitHub avatars
        ],
        mediaSrc: [
          "'self'",
          "blob:",
          "https://firebasestorage.googleapis.com"
        ],
        connectSrc: [
          "'self'",
          "wss:",
          "ws:",
          "https://api.openai.com",
          "https://api.anthropic.com",
          "https://generativelanguage.googleapis.com",
          "https://firebase.googleapis.com",
          "https://firestore.googleapis.com",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
          "https://api.spotify.com",
          "https://accounts.spotify.com",
          "https://api.ipify.org" // For IP detection
        ],
        frameSrc: [
          "'self'",
          "https://www.google.com",
          "https://accounts.google.com",
          "https://firebase.google.com"
        ],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
      }
    };

    // Apply Helmet security headers
    app.use(helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: csp.directives
      },
      crossOriginEmbedderPolicy: false, // Disable for Firebase compatibility
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      frameguard: { action: 'deny' },
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    }));

    // Additional security headers
    app.use((req, res, next) => {
      // Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');
      
      // Prevent MIME type sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // XSS Protection
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // Referrer Policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Feature Policy / Permissions Policy
      res.setHeader('Permissions-Policy', 
        'camera=self, microphone=self, geolocation=self, payment=none, usb=none'
      );
      
      // Remove server information
      res.removeHeader('X-Powered-By');
      
      next();
    });
  }

  static setupCORS(app) {
    const corsOptions = {
      origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://zeeky.ai',
          'https://www.zeeky.ai',
          'https://app.zeeky.ai',
          'https://joachimazeeky.firebaseapp.com',
          'https://joachimazeeky.web.app'
        ];

        if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-User-ID',
        'X-API-Key',
        'X-Forwarded-For'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
      maxAge: 86400 // 24 hours
    };

    app.use(cors(corsOptions));
  }

  static setupRateLimiting(app) {
    // General rate limiting
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 900 // 15 minutes in seconds
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests from this IP, please try again later.',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
      }
    });

    // Stricter rate limiting for auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 auth requests per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 900
      },
      skipSuccessfulRequests: true,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Authentication rate limit exceeded',
          message: 'Too many authentication attempts from this IP.',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
      }
    });

    // API rate limiting
    const apiLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30, // Limit each IP to 30 API requests per minute
      message: {
        error: 'API rate limit exceeded',
        retryAfter: 60
      },
      handler: (req, res) => {
        res.status(429).json({
          error: 'API rate limit exceeded',
          message: 'Too many API requests, please slow down.',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
      }
    });

    // Admin endpoints rate limiting
    const adminLimiter = rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 50, // Limit admin operations
      message: {
        error: 'Admin rate limit exceeded',
        retryAfter: 300
      },
      handler: (req, res) => {
        res.status(429).json({
          error: 'Admin rate limit exceeded',
          message: 'Too many admin operations, please wait.',
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
      }
    });

    // Apply rate limiters
    app.use('/api/', generalLimiter);
    app.use('/auth/', authLimiter);
    app.use('/api/ai/', apiLimiter);
    app.use('/admin/', adminLimiter);
  }

  static setupInputValidation(app) {
    // Body size limits
    app.use(require('express').json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        try {
          JSON.parse(buf);
        } catch (e) {
          throw new Error('Invalid JSON');
        }
      }
    }));

    app.use(require('express').urlencoded({ 
      limit: '10mb', 
      extended: true,
      parameterLimit: 100
    }));

    // Input sanitization middleware
    app.use((req, res, next) => {
      // Remove null bytes
      const removeNullBytes = (obj) => {
        if (typeof obj === 'string') {
          return obj.replace(/\0/g, '');
        }
        if (typeof obj === 'object' && obj !== null) {
          const cleaned = {};
          for (const key in obj) {
            cleaned[key] = removeNullBytes(obj[key]);
          }
          return cleaned;
        }
        return obj;
      };

      if (req.body) {
        req.body = removeNullBytes(req.body);
      }
      if (req.query) {
        req.query = removeNullBytes(req.query);
      }
      if (req.params) {
        req.params = removeNullBytes(req.params);
      }

      next();
    });
  }

  static setupErrorHandling(app) {
    // Global error handler
    app.use((err, req, res, next) => {
      // Log error for monitoring
      console.error('Security Error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Security error responses
      if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
          error: 'CORS_ERROR',
          message: 'Origin not allowed'
        });
      }

      if (err.message === 'Invalid JSON') {
        return res.status(400).json({
          error: 'INVALID_JSON',
          message: 'Request body contains invalid JSON'
        });
      }

      if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
          error: 'CSRF_ERROR',
          message: 'Invalid CSRF token'
        });
      }

      // Generic error response (don't expose internal details)
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      });
    });
  }

  static init(app) {
    console.log('🛡️ Initializing security middleware...');
    
    this.setupSecurityHeaders(app);
    this.setupCORS(app);
    this.setupRateLimiting(app);
    this.setupInputValidation(app);
    this.setupErrorHandling(app);
    
    console.log('✅ Security middleware initialized');
  }
}

module.exports = SecurityMiddleware;