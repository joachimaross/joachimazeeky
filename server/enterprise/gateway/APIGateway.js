// Enterprise API Gateway with Microservices Architecture
const express = require('express');
const httpProxy = require('http-proxy-middleware');
const CircuitBreaker = require('opossum');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const helmet = require('helmet');

class EnterpriseAPIGateway {
  constructor() {
    this.app = express();
    this.services = new Map();
    this.circuitBreakers = new Map();
    this.rateLimiters = new Map();
    this.healthStatus = new Map();
    
    this.initializeMiddleware();
    this.initializeServices();
    this.startHealthChecks();
  }

  // Initialize gateway middleware
  initializeMiddleware() {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // Compression
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6,
      threshold: 1024
    }));

    // Request logging
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      });
      next();
    });

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, x-tenant-id');
      res.header('Access-Control-Expose-Headers', 'X-Rate-Limit-Limit, X-Rate-Limit-Remaining, X-Rate-Limit-Reset');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  // Initialize microservices
  initializeServices() {
    // AI Service
    this.registerService('ai', {
      target: process.env.AI_SERVICE_URL || 'http://localhost:3001',
      pathPrefix: '/api/ai',
      healthCheck: '/health',
      circuitBreaker: {
        timeout: 30000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000
      },
      rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        max: 100 // 100 requests per minute
      }
    });

    // File Processing Service
    this.registerService('files', {
      target: process.env.FILES_SERVICE_URL || 'http://localhost:3002',
      pathPrefix: '/api/files',
      healthCheck: '/health',
      circuitBreaker: {
        timeout: 60000, // Longer timeout for file processing
        errorThresholdPercentage: 30,
        resetTimeout: 60000
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 50 // 50 file uploads per 15 minutes
      }
    });

    // Voice Service
    this.registerService('voice', {
      target: process.env.VOICE_SERVICE_URL || 'http://localhost:3003',
      pathPrefix: '/api/voice',
      healthCheck: '/health',
      circuitBreaker: {
        timeout: 45000,
        errorThresholdPercentage: 40,
        resetTimeout: 45000
      },
      rateLimit: {
        windowMs: 10 * 60 * 1000, // 10 minutes
        max: 20 // 20 voice operations per 10 minutes
      }
    });

    // Analytics Service
    this.registerService('analytics', {
      target: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3004',
      pathPrefix: '/api/analytics',
      healthCheck: '/health',
      circuitBreaker: {
        timeout: 15000,
        errorThresholdPercentage: 25,
        resetTimeout: 30000
      },
      rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        max: 200 // 200 analytics requests per minute
      }
    });

    // User Management Service
    this.registerService('users', {
      target: process.env.USERS_SERVICE_URL || 'http://localhost:3005',
      pathPrefix: '/api/users',
      healthCheck: '/health',
      circuitBreaker: {
        timeout: 10000,
        errorThresholdPercentage: 20,
        resetTimeout: 20000
      },
      rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        max: 300 // 300 user operations per minute
      }
    });

    // Notification Service
    this.registerService('notifications', {
      target: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3006',
      pathPrefix: '/api/notifications',
      healthCheck: '/health',
      circuitBreaker: {
        timeout: 20000,
        errorThresholdPercentage: 30,
        resetTimeout: 30000
      },
      rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        max: 500 // 500 notifications per minute
      }
    });
  }

  // Register a microservice
  registerService(name, config) {
    this.services.set(name, config);

    // Create circuit breaker
    const circuitBreaker = new CircuitBreaker(
      this.createServiceProxy(config),
      config.circuitBreaker
    );

    circuitBreaker.on('open', () => {
      console.warn(`Circuit breaker opened for service: ${name}`);
    });

    circuitBreaker.on('halfOpen', () => {
      console.info(`Circuit breaker half-open for service: ${name}`);
    });

    circuitBreaker.on('close', () => {
      console.info(`Circuit breaker closed for service: ${name}`);
    });

    this.circuitBreakers.set(name, circuitBreaker);

    // Create rate limiter
    const rateLimiter = rateLimit({
      ...config.rateLimit,
      keyGenerator: (req) => {
        return `${req.ip}:${req.headers['x-tenant-id'] || 'default'}:${name}`;
      },
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          error: `Rate limit exceeded for ${name} service`,
          retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
        });
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    this.rateLimiters.set(name, rateLimiter);

    // Set up routing
    this.app.use(config.pathPrefix, rateLimiter, (req, res, next) => {
      circuitBreaker.fire(req, res, next).catch(err => {
        console.error(`Service ${name} error:`, err);
        res.status(503).json({
          success: false,
          error: `Service ${name} temporarily unavailable`,
          code: 'SERVICE_UNAVAILABLE'
        });
      });
    });
  }

  // Create service proxy
  createServiceProxy(config) {
    const proxy = httpProxy.createProxyMiddleware({
      target: config.target,
      changeOrigin: true,
      pathRewrite: (path, req) => {
        return path.replace(config.pathPrefix, '');
      },
      timeout: config.circuitBreaker.timeout,
      proxyTimeout: config.circuitBreaker.timeout,
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            error: 'Bad Gateway',
            code: 'PROXY_ERROR'
          });
        }
      },
      onProxyReq: (proxyReq, req, res) => {
        // Add correlation ID for tracing
        const correlationId = req.headers['x-correlation-id'] || 
                            `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        proxyReq.setHeader('x-correlation-id', correlationId);
        
        // Forward tenant information
        if (req.headers['x-tenant-id']) {
          proxyReq.setHeader('x-tenant-id', req.headers['x-tenant-id']);
        }
        
        // Add source gateway header
        proxyReq.setHeader('x-source-gateway', 'zeeky-api-gateway');
      },
      onProxyRes: (proxyRes, req, res) => {
        // Add response headers
        res.setHeader('x-gateway-version', '1.0.0');
        res.setHeader('x-response-time', Date.now() - req.startTime);
        
        // Handle service-specific responses
        if (proxyRes.statusCode >= 500) {
          console.error(`Service error: ${req.method} ${req.path} - ${proxyRes.statusCode}`);
        }
      }
    });

    return (req, res, next) => {
      req.startTime = Date.now();
      return proxy(req, res, next);
    };
  }

  // Health check endpoints
  setupHealthChecks() {
    // Overall gateway health
    this.app.get('/health', (req, res) => {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: Object.fromEntries(this.healthStatus),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.GATEWAY_VERSION || '1.0.0'
      };

      const hasUnhealthyServices = Array.from(this.healthStatus.values())
        .some(status => !status.healthy);

      if (hasUnhealthyServices) {
        health.status = 'degraded';
        res.status(503);
      }

      res.json(health);
    });

    // Individual service health
    this.app.get('/health/:service', (req, res) => {
      const serviceName = req.params.service;
      const serviceHealth = this.healthStatus.get(serviceName);

      if (!serviceHealth) {
        return res.status(404).json({
          error: 'Service not found'
        });
      }

      res.status(serviceHealth.healthy ? 200 : 503).json(serviceHealth);
    });
  }

  // Start health checks for all services
  startHealthChecks() {
    setInterval(async () => {
      for (const [serviceName, config] of this.services) {
        try {
          const response = await fetch(`${config.target}${config.healthCheck}`, {
            timeout: 5000
          });

          const isHealthy = response.ok;
          this.healthStatus.set(serviceName, {
            healthy: isHealthy,
            status: isHealthy ? 'up' : 'down',
            lastCheck: new Date().toISOString(),
            responseTime: response.headers.get('x-response-time') || 'unknown',
            version: response.headers.get('x-service-version') || 'unknown'
          });

        } catch (error) {
          this.healthStatus.set(serviceName, {
            healthy: false,
            status: 'down',
            lastCheck: new Date().toISOString(),
            error: error.message
          });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  // API versioning support
  setupVersioning() {
    // Version-specific routing
    this.app.use('/v1', (req, res, next) => {
      req.apiVersion = 'v1';
      next();
    });

    this.app.use('/v2', (req, res, next) => {
      req.apiVersion = 'v2';
      next();
    });

    // Default to latest version
    this.app.use('/api', (req, res, next) => {
      if (!req.apiVersion) {
        req.apiVersion = 'v2'; // Latest version
      }
      next();
    });
  }

  // Request/Response transformation
  setupTransformations() {
    // Request transformation middleware
    this.app.use((req, res, next) => {
      // Normalize request format
      if (req.body && typeof req.body === 'string') {
        try {
          req.body = JSON.parse(req.body);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }

      // Add request metadata
      req.gateway = {
        requestId: req.headers['x-correlation-id'] || 
                  `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        version: req.apiVersion || 'v2',
        clientIP: req.ip,
        userAgent: req.headers['user-agent']
      };

      next();
    });

    // Response transformation middleware
    this.app.use((req, res, next) => {
      const originalSend = res.send;
      
      res.send = function(data) {
        // Add standard response wrapper
        if (res.statusCode < 400 && data && typeof data === 'object') {
          const wrappedResponse = {
            success: true,
            data: data,
            meta: {
              requestId: req.gateway.requestId,
              timestamp: new Date().toISOString(),
              version: req.gateway.version,
              processingTime: Date.now() - new Date(req.gateway.timestamp).getTime()
            }
          };
          return originalSend.call(this, JSON.stringify(wrappedResponse));
        }
        
        return originalSend.call(this, data);
      };

      next();
    });
  }

  // Metrics and monitoring
  setupMetrics() {
    const metrics = {
      requests: new Map(),
      responses: new Map(),
      errors: new Map()
    };

    // Request metrics
    this.app.use((req, res, next) => {
      const key = `${req.method}:${req.path}`;
      const current = metrics.requests.get(key) || 0;
      metrics.requests.set(key, current + 1);
      next();
    });

    // Response metrics
    this.app.use((req, res, next) => {
      res.on('finish', () => {
        const key = `${req.method}:${req.path}:${res.statusCode}`;
        const current = metrics.responses.get(key) || 0;
        metrics.responses.set(key, current + 1);

        if (res.statusCode >= 400) {
          const errorKey = `${req.method}:${req.path}`;
          const errorCount = metrics.errors.get(errorKey) || 0;
          metrics.errors.set(errorKey, errorCount + 1);
        }
      });
      next();
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      res.json({
        timestamp: new Date().toISOString(),
        requests: Object.fromEntries(metrics.requests),
        responses: Object.fromEntries(metrics.responses),
        errors: Object.fromEntries(metrics.errors),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });
  }

  // Service discovery integration
  setupServiceDiscovery() {
    // Consul integration (placeholder)
    const consulClient = {
      registerService: (name, config) => {
        console.log(`Registering service ${name} with Consul`);
        // Actual Consul registration would go here
      },
      
      discoverServices: async () => {
        console.log('Discovering services from Consul');
        // Actual service discovery would go here
        return [];
      }
    };

    // Register gateway with service discovery
    consulClient.registerService('api-gateway', {
      port: process.env.PORT || 3000,
      health: '/health',
      tags: ['api', 'gateway', 'enterprise']
    });
  }

  // Load balancing for multiple service instances
  setupLoadBalancing() {
    const serviceInstances = new Map();

    // Add service instance
    this.addServiceInstance = (serviceName, instance) => {
      if (!serviceInstances.has(serviceName)) {
        serviceInstances.set(serviceName, []);
      }
      serviceInstances.get(serviceName).push(instance);
    };

    // Round-robin load balancer
    const roundRobinCounters = new Map();
    
    this.getServiceInstance = (serviceName) => {
      const instances = serviceInstances.get(serviceName) || [];
      if (instances.length === 0) {
        return null;
      }

      const counter = roundRobinCounters.get(serviceName) || 0;
      const instance = instances[counter % instances.length];
      roundRobinCounters.set(serviceName, counter + 1);
      
      return instance;
    };
  }

  // Request caching
  setupCaching() {
    const cache = new Map();
    const cacheTTL = new Map();

    // Cache middleware
    const cacheMiddleware = (ttl = 300) => {
      return (req, res, next) => {
        const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
        const cached = cache.get(cacheKey);
        const cacheTime = cacheTTL.get(cacheKey);

        if (cached && cacheTime && Date.now() - cacheTime < ttl * 1000) {
          res.setHeader('X-Cache', 'HIT');
          return res.json(cached);
        }

        const originalSend = res.send;
        res.send = function(data) {
          if (res.statusCode === 200) {
            cache.set(cacheKey, JSON.parse(data));
            cacheTTL.set(cacheKey, Date.now());
            res.setHeader('X-Cache', 'MISS');
          }
          return originalSend.call(this, data);
        };

        next();
      };
    };

    // Apply caching to specific routes
    this.app.use('/api/analytics/reports', cacheMiddleware(600)); // 10 minutes
    this.app.use('/api/users/profile', cacheMiddleware(300)); // 5 minutes
  }

  // Authentication and authorization
  setupAuth() {
    // JWT verification middleware
    const verifyJWT = (req, res, next) => {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
      } catch (error) {
        res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }
    };

    // Apply authentication to all API routes
    this.app.use('/api', verifyJWT);
  }

  // Start the gateway
  start(port = process.env.PORT || 3000) {
    this.setupHealthChecks();
    this.setupVersioning();
    this.setupTransformations();
    this.setupMetrics();
    this.setupServiceDiscovery();
    this.setupLoadBalancing();
    this.setupCaching();
    this.setupAuth();

    // Fallback for unmatched routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        path: req.path,
        method: req.method
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Gateway error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal gateway error',
        code: 'GATEWAY_ERROR',
        requestId: req.gateway?.requestId
      });
    });

    this.server = this.app.listen(port, () => {
      console.log(`🌐 Enterprise API Gateway running on port ${port}`);
      console.log(`📊 Health check available at http://localhost:${port}/health`);
      console.log(`📈 Metrics available at http://localhost:${port}/metrics`);
    });

    return this.server;
  }

  // Graceful shutdown
  async shutdown() {
    console.log('Shutting down API Gateway...');
    
    // Close circuit breakers
    for (const breaker of this.circuitBreakers.values()) {
      breaker.shutdown();
    }

    // Close server
    if (this.server) {
      this.server.close();
    }

    console.log('API Gateway shutdown complete');
  }
}

module.exports = EnterpriseAPIGateway;