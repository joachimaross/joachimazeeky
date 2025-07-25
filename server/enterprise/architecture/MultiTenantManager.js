// Enterprise Multi-Tenant Architecture Manager
const database = require('../../models/database');
const crypto = require('crypto');

class MultiTenantManager {
  constructor() {
    this.tenantConfigs = new Map();
    this.resourcePools = new Map();
    this.tenantMiddleware = this.createTenantMiddleware();
    this.initializeDefaultSettings();
  }

  // Initialize default tenant settings
  initializeDefaultSettings() {
    this.defaultTenantConfig = {
      // Resource limits
      maxUsers: 1000,
      maxStorageGB: 100,
      maxAPICallsPerHour: 10000,
      maxConcurrentSessions: 100,
      
      // Feature flags
      features: {
        aiAssistant: true,
        voiceCloning: true,
        fileProcessing: true,
        calendarIntegration: true,
        realTimeChat: true,
        advancedAnalytics: false,
        customBranding: false,
        ssoIntegration: false,
        apiAccess: false,
        webhooks: false
      },
      
      // Security settings
      security: {
        enforceSSO: false,
        requireMFA: false,
        passwordPolicy: 'standard',
        sessionTimeout: 8, // hours
        ipWhitelist: [],
        allowedDomains: []
      },
      
      // Customization
      branding: {
        logoUrl: '/default-logo.png',
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        companyName: 'Zeeky AI',
        customCSS: '',
        favicon: '/favicon.ico'
      },
      
      // Integrations
      integrations: {
        allowedProviders: ['google', 'microsoft', 'slack'],
        customIntegrations: [],
        webhookEndpoints: []
      }
    };
  }

  // Create tenant middleware for request routing
  createTenantMiddleware() {
    return async (req, res, next) => {
      try {
        // Extract tenant identifier from various sources
        const tenantId = this.extractTenantId(req);
        
        if (!tenantId) {
          return res.status(400).json({
            success: false,
            error: 'Tenant identification required',
            code: 'TENANT_MISSING'
          });
        }

        // Load tenant configuration
        const tenant = await this.getTenant(tenantId);
        
        if (!tenant || !tenant.isActive) {
          return res.status(404).json({
            success: false,
            error: 'Tenant not found or inactive',
            code: 'TENANT_INVALID'
          });
        }

        // Check tenant resource limits
        const resourceCheck = await this.checkResourceLimits(tenant, req);
        if (!resourceCheck.allowed) {
          return res.status(429).json({
            success: false,
            error: resourceCheck.reason,
            code: 'RESOURCE_LIMIT_EXCEEDED'
          });
        }

        // Set tenant context
        req.tenant = tenant;
        req.tenantId = tenantId;
        req.tenantConfig = tenant.config;

        // Set database schema/connection for tenant isolation
        await this.setTenantContext(tenantId);

        next();
      } catch (error) {
        console.error('Tenant middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Tenant resolution failed',
          code: 'TENANT_ERROR'
        });
      }
    };
  }

  // Extract tenant ID from request
  extractTenantId(req) {
    // Priority order for tenant identification:
    
    // 1. Custom header
    let tenantId = req.headers['x-tenant-id'];
    if (tenantId) return tenantId;
    
    // 2. Subdomain (e.g., acme.zeeky.ai)
    const host = req.headers.host;
    if (host) {
      const subdomain = host.split('.')[0];
      if (subdomain !== 'www' && subdomain !== 'api') {
        tenantId = subdomain;
      }
    }
    if (tenantId) return tenantId;
    
    // 3. URL path (e.g., /tenant/acme/api/...)
    const pathMatch = req.path.match(/^\/tenant\/([^\/]+)/);
    if (pathMatch) {
      return pathMatch[1];
    }
    
    // 4. JWT token tenant claim
    if (req.user && req.user.tenantId) {
      return req.user.tenantId;
    }
    
    // 5. Query parameter (fallback)
    if (req.query.tenant) {
      return req.query.tenant;
    }
    
    return null;
  }

  // Create new tenant
  async createTenant(tenantData) {
    const {
      name,
      domain,
      adminEmail,
      planType = 'starter',
      customConfig = {}
    } = tenantData;

    // Generate unique tenant ID
    const tenantId = this.generateTenantId(name);
    
    // Merge with default configuration
    const config = {
      ...this.defaultTenantConfig,
      ...this.getPlanConfig(planType),
      ...customConfig
    };

    // Create tenant database schema
    await this.createTenantSchema(tenantId);

    // Insert tenant record
    const tenant = await database.pgPool.query(`
      INSERT INTO tenants (
        id, name, domain, admin_email, plan_type, config, 
        database_schema, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      tenantId,
      name,
      domain,
      adminEmail,
      planType,
      JSON.stringify(config),
      `tenant_${tenantId}`,
      true
    ]);

    // Create initial admin user for tenant
    await this.createTenantAdmin(tenantId, adminEmail);

    // Initialize tenant resources
    await this.initializeTenantResources(tenantId);

    // Cache tenant configuration
    this.tenantConfigs.set(tenantId, {
      ...tenant.rows[0],
      config: config
    });

    return tenant.rows[0];
  }

  // Generate unique tenant ID
  generateTenantId(name) {
    const baseId = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    
    const suffix = crypto.randomBytes(4).toString('hex');
    return `${baseId}_${suffix}`;
  }

  // Get plan-specific configuration
  getPlanConfig(planType) {
    const planConfigs = {
      starter: {
        maxUsers: 10,
        maxStorageGB: 5,
        maxAPICallsPerHour: 1000,
        maxConcurrentSessions: 10,
        features: {
          aiAssistant: true,
          voiceCloning: false,
          fileProcessing: true,
          calendarIntegration: false,
          realTimeChat: true,
          advancedAnalytics: false,
          customBranding: false,
          ssoIntegration: false,
          apiAccess: false,
          webhooks: false
        }
      },
      professional: {
        maxUsers: 100,
        maxStorageGB: 50,
        maxAPICallsPerHour: 5000,
        maxConcurrentSessions: 50,
        features: {
          aiAssistant: true,
          voiceCloning: true,
          fileProcessing: true,
          calendarIntegration: true,
          realTimeChat: true,
          advancedAnalytics: true,
          customBranding: true,
          ssoIntegration: false,
          apiAccess: true,
          webhooks: true
        }
      },
      enterprise: {
        maxUsers: 10000,
        maxStorageGB: 1000,
        maxAPICallsPerHour: 50000,
        maxConcurrentSessions: 1000,
        features: {
          aiAssistant: true,
          voiceCloning: true,
          fileProcessing: true,
          calendarIntegration: true,
          realTimeChat: true,
          advancedAnalytics: true,
          customBranding: true,
          ssoIntegration: true,
          apiAccess: true,
          webhooks: true
        }
      }
    };

    return planConfigs[planType] || planConfigs.starter;
  }

  // Create isolated database schema for tenant
  async createTenantSchema(tenantId) {
    const schemaName = `tenant_${tenantId}`;
    
    // Create schema
    await database.pgPool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    
    // Create tenant-specific tables
    const tables = [
      'users', 'conversations', 'messages', 'ai_memories',
      'file_uploads', 'voice_profiles', 'usage_analytics'
    ];

    for (const table of tables) {
      await database.pgPool.query(`
        CREATE TABLE IF NOT EXISTS ${schemaName}.${table} 
        (LIKE public.${table} INCLUDING ALL)
      `);
    }

    // Set up Row Level Security policies
    await this.setupTenantRLS(schemaName);
  }

  // Set up Row Level Security for tenant
  async setupTenantRLS(schemaName) {
    const tables = ['users', 'conversations', 'messages'];
    
    for (const table of tables) {
      // Enable RLS
      await database.pgPool.query(`
        ALTER TABLE ${schemaName}.${table} ENABLE ROW LEVEL SECURITY
      `);
      
      // Create policy for tenant isolation
      await database.pgPool.query(`
        CREATE POLICY tenant_isolation ON ${schemaName}.${table}
        USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
      `);
    }
  }

  // Get tenant configuration
  async getTenant(tenantId) {
    // Check cache first
    if (this.tenantConfigs.has(tenantId)) {
      return this.tenantConfigs.get(tenantId);
    }

    // Query database
    const result = await database.pgPool.query(`
      SELECT * FROM tenants WHERE id = $1 AND is_active = true
    `, [tenantId]);

    if (result.rows.length === 0) {
      return null;
    }

    const tenant = result.rows[0];
    tenant.config = JSON.parse(tenant.config);

    // Cache for future requests
    this.tenantConfigs.set(tenantId, tenant);

    return tenant;
  }

  // Set tenant context for database operations
  async setTenantContext(tenantId) {
    // Set PostgreSQL session variable for RLS
    await database.pgPool.query(`
      SELECT set_config('app.current_tenant_id', $1, true)
    `, [tenantId]);
    
    // Set search path to tenant schema
    await database.pgPool.query(`
      SET search_path TO tenant_${tenantId}, public
    `);
  }

  // Check resource limits for tenant
  async checkResourceLimits(tenant, req) {
    const config = tenant.config;
    
    // Check API rate limits
    const apiCallsKey = `api_calls_${tenant.id}_${new Date().getHours()}`;
    const currentAPICalls = await database.getCache(apiCallsKey) || 0;
    
    if (currentAPICalls >= config.maxAPICallsPerHour) {
      return {
        allowed: false,
        reason: 'API rate limit exceeded',
        limit: config.maxAPICallsPerHour,
        current: currentAPICalls
      };
    }

    // Check concurrent sessions
    const activeSessions = await database.pgPool.query(`
      SELECT COUNT(*) as count FROM user_sessions 
      WHERE tenant_id = $1 AND logout_time IS NULL
    `, [tenant.id]);

    if (activeSessions.rows[0].count >= config.maxConcurrentSessions) {
      return {
        allowed: false,
        reason: 'Maximum concurrent sessions reached',
        limit: config.maxConcurrentSessions,
        current: activeSessions.rows[0].count
      };
    }

    // Check storage limits
    const storageUsed = await database.pgPool.query(`
      SELECT COALESCE(SUM(file_size), 0) as total_bytes
      FROM file_uploads WHERE tenant_id = $1
    `, [tenant.id]);

    const storageUsedGB = storageUsed.rows[0].total_bytes / (1024 * 1024 * 1024);
    if (storageUsedGB >= config.maxStorageGB) {
      return {
        allowed: false,
        reason: 'Storage limit exceeded',
        limit: config.maxStorageGB,
        current: storageUsedGB
      };
    }

    // Update API call counter
    await database.setCache(apiCallsKey, currentAPICalls + 1, 3600); // 1 hour TTL

    return { allowed: true };
  }

  // Create tenant admin user
  async createTenantAdmin(tenantId, email) {
    const adminUser = await database.createUser({
      email: email,
      username: email.split('@')[0],
      tenantId: tenantId,
      role: 'admin',
      isActive: true
    });

    return adminUser;
  }

  // Initialize tenant resources
  async initializeTenantResources(tenantId) {
    // Create default AI personas for tenant
    const defaultPersonas = [
      { name: 'Assistant', type: 'default', config: {} },
      { name: 'Business Advisor', type: 'business', config: {} },
      { name: 'Creative Helper', type: 'creative', config: {} }
    ];

    for (const persona of defaultPersonas) {
      await database.pgPool.query(`
        INSERT INTO ai_personas (tenant_id, name, type, config, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [tenantId, persona.name, persona.type, JSON.stringify(persona.config)]);
    }

    // Create default workflows
    const defaultWorkflows = [
      { name: 'Welcome New Users', type: 'onboarding', triggers: ['user_created'] },
      { name: 'Weekly Summary', type: 'reporting', triggers: ['schedule'] }
    ];

    for (const workflow of defaultWorkflows) {
      await database.pgPool.query(`
        INSERT INTO workflows (tenant_id, name, type, triggers, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [tenantId, workflow.name, workflow.type, JSON.stringify(workflow.triggers)]);
    }
  }

  // Update tenant configuration
  async updateTenantConfig(tenantId, updates) {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Merge configuration updates
    const newConfig = {
      ...tenant.config,
      ...updates
    };

    // Update database
    await database.pgPool.query(`
      UPDATE tenants SET config = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(newConfig), tenantId]);

    // Update cache
    tenant.config = newConfig;
    this.tenantConfigs.set(tenantId, tenant);

    return tenant;
  }

  // Tenant migration utilities
  async migrateTenant(sourceTenantId, targetTenantId) {
    // Export tenant data
    const exportData = await this.exportTenantData(sourceTenantId);
    
    // Import to target tenant
    await this.importTenantData(targetTenantId, exportData);
    
    return { success: true, recordsMigrated: exportData.totalRecords };
  }

  // Export tenant data
  async exportTenantData(tenantId) {
    const tables = ['users', 'conversations', 'messages', 'file_uploads'];
    const exportData = { tenantId, tables: {}, totalRecords: 0 };

    for (const table of tables) {
      const result = await database.pgPool.query(`
        SELECT * FROM tenant_${tenantId}.${table}
      `);
      
      exportData.tables[table] = result.rows;
      exportData.totalRecords += result.rows.length;
    }

    return exportData;
  }

  // Import tenant data
  async importTenantData(tenantId, importData) {
    for (const [table, records] of Object.entries(importData.tables)) {
      for (const record of records) {
        // Update tenant ID
        record.tenant_id = tenantId;
        
        // Insert record (simplified - would need proper column handling)
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        await database.pgPool.query(`
          INSERT INTO tenant_${tenantId}.${table} (${columns.join(', ')})
          VALUES (${placeholders})
        `, values);
      }
    }
  }

  // Tenant analytics and reporting
  async getTenantAnalytics(tenantId, timeRange = '30d') {
    const analytics = {
      tenantId: tenantId,
      timeRange: timeRange,
      metrics: {}
    };

    // User metrics
    const userMetrics = await database.pgPool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '${timeRange}' THEN 1 END) as new_users,
        COUNT(CASE WHEN last_login >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_users
      FROM tenant_${tenantId}.users
    `);

    analytics.metrics.users = userMetrics.rows[0];

    // Usage metrics
    const usageMetrics = await database.pgPool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        AVG(EXTRACT(EPOCH FROM (logout_time - login_time))/60) as avg_session_duration,
        COUNT(DISTINCT user_id) as unique_users
      FROM tenant_${tenantId}.user_sessions
      WHERE login_time >= CURRENT_DATE - INTERVAL '${timeRange}'
    `);

    analytics.metrics.usage = usageMetrics.rows[0];

    // AI interaction metrics
    const aiMetrics = await database.pgPool.query(`
      SELECT 
        COUNT(*) as total_messages,
        AVG(processing_time) as avg_response_time,
        COUNT(CASE WHEN role = 'assistant' THEN 1 END) as ai_responses
      FROM tenant_${tenantId}.messages
      WHERE created_at >= CURRENT_DATE - INTERVAL '${timeRange}'
    `);

    analytics.metrics.ai = aiMetrics.rows[0];

    return analytics;
  }

  // Suspend/activate tenant
  async setTenantStatus(tenantId, isActive, reason = '') {
    await database.pgPool.query(`
      UPDATE tenants 
      SET is_active = $1, suspension_reason = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [isActive, reason, tenantId]);

    // Clear cache
    this.tenantConfigs.delete(tenantId);

    // Log status change
    await database.logEvent('system', 'tenant_status_changed', {
      tenantId: tenantId,
      isActive: isActive,
      reason: reason
    });
  }

  // Get tenant usage summary
  async getTenantUsageSummary(tenantId) {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const summary = {
      tenantId: tenantId,
      plan: tenant.plan_type,
      limits: tenant.config,
      currentUsage: {}
    };

    // Get current usage
    const userCount = await database.pgPool.query(`
      SELECT COUNT(*) as count FROM tenant_${tenantId}.users
    `);
    summary.currentUsage.users = userCount.rows[0].count;

    const storageUsage = await database.pgPool.query(`
      SELECT COALESCE(SUM(file_size), 0) as total_bytes
      FROM tenant_${tenantId}.file_uploads
    `);
    summary.currentUsage.storageGB = storageUsage.rows[0].total_bytes / (1024 * 1024 * 1024);

    const apiCallsKey = `api_calls_${tenantId}_${new Date().getHours()}`;
    summary.currentUsage.apiCallsThisHour = await database.getCache(apiCallsKey) || 0;

    const activeSessions = await database.pgPool.query(`
      SELECT COUNT(*) as count FROM tenant_${tenantId}.user_sessions 
      WHERE logout_time IS NULL
    `);
    summary.currentUsage.activeSessions = activeSessions.rows[0].count;

    return summary;
  }

  // Cleanup inactive tenants
  async cleanupInactiveTenants(daysInactive = 90) {
    const inactiveTenants = await database.pgPool.query(`
      SELECT id FROM tenants 
      WHERE last_activity < CURRENT_DATE - INTERVAL '${daysInactive} days'
      AND is_active = false
    `);

    for (const tenant of inactiveTenants.rows) {
      await this.deleteTenant(tenant.id);
    }

    return inactiveTenants.rows.length;
  }

  // Delete tenant (soft delete with data retention)
  async deleteTenant(tenantId, hardDelete = false) {
    if (hardDelete) {
      // Drop tenant schema
      await database.pgPool.query(`DROP SCHEMA IF EXISTS tenant_${tenantId} CASCADE`);
      
      // Delete tenant record
      await database.pgPool.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
    } else {
      // Soft delete - mark as deleted but retain data
      await database.pgPool.query(`
        UPDATE tenants 
        SET is_active = false, deleted_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [tenantId]);
    }

    // Clear cache
    this.tenantConfigs.delete(tenantId);
  }
}

module.exports = MultiTenantManager;