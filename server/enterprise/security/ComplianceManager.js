// Enterprise Security & Compliance Management System
const crypto = require('crypto');
const database = require('../../models/database');
const fs = require('fs').promises;
const path = require('path');

class ComplianceManager {
  constructor() {
    this.auditLogger = this.createAuditLogger();
    this.complianceFrameworks = new Map();
    this.securityPolicies = new Map();
    this.encryptionKeys = new Map();
    this.accessControls = new Map();
    
    this.initializeFrameworks();
    this.initializeSecurityPolicies();
    this.initializeEncryption();
  }

  // Initialize compliance frameworks
  initializeFrameworks() {
    // SOC 2 Type II Compliance
    this.complianceFrameworks.set('soc2', {
      name: 'SOC 2 Type II',
      controls: {
        CC1: 'Control Environment',
        CC2: 'Communication and Information',
        CC3: 'Risk Assessment',
        CC4: 'Monitoring Activities',
        CC5: 'Control Activities',
        CC6: 'Logical and Physical Access Controls',
        CC7: 'System Operations',
        CC8: 'Change Management',
        CC9: 'Risk Mitigation'
      },
      requirements: [
        'Access control logging',
        'Data encryption at rest and in transit',
        'Regular security assessments',
        'Incident response procedures',
        'Vendor management',
        'Change management processes',
        'Monitoring and alerting',
        'Data retention and disposal'
      ]
    });

    // GDPR Compliance
    this.complianceFrameworks.set('gdpr', {
      name: 'General Data Protection Regulation',
      principles: [
        'Lawfulness, fairness and transparency',
        'Purpose limitation',
        'Data minimisation',
        'Accuracy',
        'Storage limitation',
        'Integrity and confidentiality',
        'Accountability'
      ],
      rights: [
        'Right to be informed',
        'Right of access',
        'Right to rectification',
        'Right to erasure',
        'Right to restrict processing',
        'Right to data portability',
        'Right to object',
        'Rights in relation to automated decision making'
      ]
    });

    // HIPAA Compliance
    this.complianceFrameworks.set('hipaa', {
      name: 'Health Insurance Portability and Accountability Act',
      safeguards: {
        administrative: [
          'Security Officer designation',
          'Workforce training',
          'Access management',
          'Information access management',
          'Security awareness and training'
        ],
        physical: [
          'Facility access controls',
          'Workstation use restrictions',
          'Device and media controls'
        ],
        technical: [
          'Access control',
          'Audit controls',
          'Integrity',
          'Person or entity authentication',
          'Transmission security'
        ]
      }
    });

    // ISO 27001 Compliance
    this.complianceFrameworks.set('iso27001', {
      name: 'ISO/IEC 27001 Information Security Management',
      domains: [
        'Information security policies',
        'Organization of information security',
        'Human resource security',
        'Asset management',
        'Access control',
        'Cryptography',
        'Physical and environmental security',
        'Operations security',
        'Communications security',
        'System acquisition, development and maintenance',
        'Supplier relationships',
        'Information security incident management',
        'Information security aspects of business continuity management',
        'Compliance'
      ]
    });
  }

  // Initialize security policies
  initializeSecurityPolicies() {
    // Data Classification Policy
    this.securityPolicies.set('data_classification', {
      levels: {
        public: {
          description: 'Information that can be freely shared',
          requirements: ['No encryption required', 'Standard backup'],
          retention: '7 years'
        },
        internal: {
          description: 'Information for internal use only',
          requirements: ['Access controls', 'Encrypted storage'],
          retention: '5 years'
        },
        confidential: {
          description: 'Sensitive business information',
          requirements: ['Strong encryption', 'Access logging', 'MFA required'],
          retention: '7 years'
        },
        restricted: {
          description: 'Highly sensitive information',
          requirements: ['End-to-end encryption', 'Strict access controls', 'Audit trail'],
          retention: '10 years'
        }
      }
    });

    // Access Control Policy
    this.securityPolicies.set('access_control', {
      principles: [
        'Principle of least privilege',
        'Need-to-know basis',
        'Separation of duties',
        'Regular access reviews'
      ],
      roles: {
        admin: {
          permissions: ['*'],
          requirements: ['MFA', 'Background check', 'Annual review']
        },
        user: {
          permissions: ['read_own_data', 'create_content', 'use_ai'],
          requirements: ['Password policy', 'Training completion']
        },
        viewer: {
          permissions: ['read_public_data'],
          requirements: ['Basic authentication']
        }
      }
    });

    // Incident Response Policy
    this.securityPolicies.set('incident_response', {
      severity_levels: {
        critical: {
          description: 'System breach or data exposure',
          response_time: '15 minutes',
          escalation: ['CISO', 'CEO', 'Legal']
        },
        high: {
          description: 'Service disruption or security vulnerability',
          response_time: '1 hour',
          escalation: ['Security team', 'Operations manager']
        },
        medium: {
          description: 'Performance issues or minor security concerns',
          response_time: '4 hours',
          escalation: ['Operations team']
        },
        low: {
          description: 'General issues or maintenance',
          response_time: '24 hours',
          escalation: ['Support team']
        }
      }
    });
  }

  // Initialize encryption systems
  initializeEncryption() {
    // Generate master encryption key if not exists
    if (!process.env.MASTER_ENCRYPTION_KEY) {
      throw new Error('MASTER_ENCRYPTION_KEY environment variable required');
    }

    this.masterKey = Buffer.from(process.env.MASTER_ENCRYPTION_KEY, 'hex');
    
    // Initialize key derivation
    this.deriveKey = (purpose, salt = null) => {
      const actualSalt = salt || crypto.randomBytes(32);
      return crypto.pbkdf2Sync(this.masterKey, actualSalt, 100000, 32, 'sha256');
    };
  }

  // Create audit logger
  createAuditLogger() {
    return {
      log: async (event, userId, details = {}) => {
        const auditEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          event: event,
          userId: userId,
          details: details,
          ipAddress: details.ipAddress,
          userAgent: details.userAgent,
          sessionId: details.sessionId,
          tenantId: details.tenantId,
          riskScore: this.calculateRiskScore(event, details)
        };

        // Store in database
        await database.pgPool.query(`
          INSERT INTO audit_logs (
            id, timestamp, event, user_id, details, ip_address, 
            user_agent, session_id, tenant_id, risk_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          auditEntry.id, auditEntry.timestamp, auditEntry.event,
          auditEntry.userId, JSON.stringify(auditEntry.details),
          auditEntry.ipAddress, auditEntry.userAgent, auditEntry.sessionId,
          auditEntry.tenantId, auditEntry.riskScore
        ]);

        // Real-time alerting for high-risk events
        if (auditEntry.riskScore >= 8) {
          await this.triggerSecurityAlert(auditEntry);
        }

        return auditEntry;
      }
    };
  }

  // Calculate risk score for audit events
  calculateRiskScore(event, details) {
    let score = 0;

    // Base scores by event type
    const eventScores = {
      'login_failed': 3,
      'login_success': 1,
      'data_access': 2,
      'data_export': 5,
      'user_created': 2,
      'user_deleted': 4,
      'permission_changed': 6,
      'system_config_changed': 8,
      'security_incident': 10
    };

    score += eventScores[event] || 1;

    // Increase score for suspicious patterns
    if (details.newLocation) score += 3;
    if (details.newDevice) score += 2;
    if (details.offHours) score += 2;
    if (details.multipleFailures) score += 4;
    if (details.privilegedAccess) score += 3;

    return Math.min(score, 10);
  }

  // Trigger security alert
  async triggerSecurityAlert(auditEntry) {
    const alert = {
      id: crypto.randomUUID(),
      type: 'security_alert',
      severity: auditEntry.riskScore >= 9 ? 'critical' : 'high',
      title: `High-risk activity detected: ${auditEntry.event}`,
      details: auditEntry,
      timestamp: new Date(),
      status: 'open'
    };

    // Store alert
    await database.pgPool.query(`
      INSERT INTO security_alerts (
        id, type, severity, title, details, timestamp, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      alert.id, alert.type, alert.severity, alert.title,
      JSON.stringify(alert.details), alert.timestamp, alert.status
    ]);

    // Send notifications (integrate with notification service)
    console.log(`SECURITY ALERT: ${alert.title}`);
  }

  // Data encryption methods
  async encryptData(data, classification = 'internal') {
    const salt = crypto.randomBytes(16);
    const key = this.deriveKey('data_encryption', salt);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher('aes-256-gcm', key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      classification: classification,
      algorithm: 'aes-256-gcm'
    };
  }

  // Data decryption methods
  async decryptData(encryptedData) {
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const key = this.deriveKey('data_encryption', salt);
    
    const decipher = crypto.createDecipher('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  // PII Detection and masking
  async detectPII(text) {
    const patterns = {
      ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      ip: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g
    };

    const detected = {};
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        detected[type] = matches;
      }
    }

    return detected;
  }

  // Mask PII data
  maskPII(text, maskChar = '*') {
    const patterns = {
      ssn: /\b(\d{3})-?(\d{2})-?(\d{4})\b/g,
      email: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      phone: /\b(\d{3})[-.]?(\d{3})[-.]?(\d{4})\b/g,
      creditCard: /\b(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})\b/g
    };

    let maskedText = text;
    
    maskedText = maskedText.replace(patterns.ssn, `${maskChar.repeat(3)}-${maskChar.repeat(2)}-$3`);
    maskedText = maskedText.replace(patterns.email, `${maskChar.repeat(3)}@$2`);
    maskedText = maskedText.replace(patterns.phone, `${maskChar.repeat(3)}-${maskChar.repeat(3)}-$3`);
    maskedText = maskedText.replace(patterns.creditCard, `${maskChar.repeat(4)}-${maskChar.repeat(4)}-${maskChar.repeat(4)}-$4`);

    return maskedText;
  }

  // GDPR Compliance methods
  async handleDataSubjectRequest(type, userId, details = {}) {
    const requestId = crypto.randomUUID();
    
    // Log the request
    await this.auditLogger.log('gdpr_request', userId, {
      requestType: type,
      requestId: requestId,
      details: details
    });

    const request = {
      id: requestId,
      type: type,
      userId: userId,
      details: details,
      status: 'pending',
      createdAt: new Date(),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    // Store request
    await database.pgPool.query(`
      INSERT INTO gdpr_requests (
        id, type, user_id, details, status, created_at, deadline
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      request.id, request.type, request.userId,
      JSON.stringify(request.details), request.status,
      request.createdAt, request.deadline
    ]);

    // Process different request types
    switch (type) {
      case 'access':
        return await this.processDataAccessRequest(request);
      case 'rectification':
        return await this.processDataRectificationRequest(request);
      case 'erasure':
        return await this.processDataErasureRequest(request);
      case 'portability':
        return await this.processDataPortabilityRequest(request);
      case 'restriction':
        return await this.processDataRestrictionRequest(request);
      default:
        throw new Error(`Unsupported GDPR request type: ${type}`);
    }
  }

  // Process data access request (Right to Access)
  async processDataAccessRequest(request) {
    const userData = await this.collectUserData(request.userId);
    
    // Generate report
    const report = {
      requestId: request.id,
      userId: request.userId,
      generatedAt: new Date(),
      dataCategories: {
        profile: userData.profile,
        conversations: userData.conversations,
        files: userData.files,
        analytics: userData.analytics
      },
      processingActivities: userData.processingActivities
    };

    // Encrypt report
    const encryptedReport = await this.encryptData(report, 'confidential');
    
    // Update request status
    await database.pgPool.query(`
      UPDATE gdpr_requests 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, 
          result_data = $1
      WHERE id = $2
    `, [JSON.stringify(encryptedReport), request.id]);

    return { requestId: request.id, status: 'completed' };
  }

  // Process data erasure request (Right to be Forgotten)
  async processDataErasureRequest(request) {
    const userId = request.userId;
    
    // Check if user has legitimate interests to keep data
    const retentionCheck = await this.checkDataRetentionRequirements(userId);
    
    if (retentionCheck.mustRetain) {
      await database.pgPool.query(`
        UPDATE gdpr_requests 
        SET status = 'rejected', completed_at = CURRENT_TIMESTAMP,
            rejection_reason = $1
        WHERE id = $2
      `, [retentionCheck.reason, request.id]);
      
      return { 
        requestId: request.id, 
        status: 'rejected', 
        reason: retentionCheck.reason 
      };
    }

    // Anonymize or delete user data
    await this.anonymizeUserData(userId);
    
    await database.pgPool.query(`
      UPDATE gdpr_requests 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [request.id]);

    return { requestId: request.id, status: 'completed' };
  }

  // Collect all user data for GDPR requests
  async collectUserData(userId) {
    const data = {
      profile: {},
      conversations: [],
      files: [],
      analytics: {},
      processingActivities: []
    };

    // Profile data
    const profileResult = await database.pgPool.query(`
      SELECT email, username, created_at, last_login, preferences
      FROM users WHERE id = $1
    `, [userId]);
    
    if (profileResult.rows.length > 0) {
      data.profile = profileResult.rows[0];
    }

    // Conversation data
    const conversationsResult = await database.pgPool.query(`
      SELECT c.id, c.title, c.created_at, 
             array_agg(json_build_object('role', m.role, 'content', m.content, 'created_at', m.created_at)) as messages
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.user_id = $1
      GROUP BY c.id, c.title, c.created_at
    `, [userId]);
    
    data.conversations = conversationsResult.rows;

    // File data
    const filesResult = await database.pgPool.query(`
      SELECT filename, original_name, file_type, file_size, created_at
      FROM file_uploads WHERE user_id = $1
    `, [userId]);
    
    data.files = filesResult.rows;

    // Analytics data
    const analyticsResult = await database.pgPool.query(`
      SELECT event_type, event_data, created_at
      FROM usage_analytics WHERE user_id = $1
      ORDER BY created_at DESC LIMIT 1000
    `, [userId]);
    
    data.analytics = analyticsResult.rows;

    return data;
  }

  // Anonymize user data
  async anonymizeUserData(userId) {
    const anonymousId = `anon_${crypto.randomBytes(16).toString('hex')}`;
    
    // Anonymize user record
    await database.pgPool.query(`
      UPDATE users SET 
        email = $1,
        username = $1,
        first_name = 'Anonymous',
        last_name = 'User',
        anonymized = true,
        anonymized_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [anonymousId, userId]);

    // Anonymize messages
    await database.pgPool.query(`
      UPDATE messages SET content = '[ANONYMIZED]' 
      WHERE user_id = $1 AND role = 'user'
    `, [userId]);

    // Delete personal files
    await database.pgPool.query(`
      DELETE FROM file_uploads WHERE user_id = $1
    `, [userId]);

    await this.auditLogger.log('data_anonymized', userId, {
      anonymousId: anonymousId,
      reason: 'GDPR erasure request'
    });
  }

  // Generate compliance reports
  async generateComplianceReport(framework, tenantId = null, timeRange = '1y') {
    const report = {
      id: crypto.randomUUID(),
      framework: framework,
      tenantId: tenantId,
      timeRange: timeRange,
      generatedAt: new Date(),
      status: 'complete',
      findings: []
    };

    switch (framework) {
      case 'soc2':
        report.findings = await this.generateSOC2Report(tenantId, timeRange);
        break;
      case 'gdpr':
        report.findings = await this.generateGDPRReport(tenantId, timeRange);
        break;
      case 'hipaa':
        report.findings = await this.generateHIPAAReport(tenantId, timeRange);
        break;
      default:
        throw new Error(`Unsupported compliance framework: ${framework}`);
    }

    // Store report
    await database.pgPool.query(`
      INSERT INTO compliance_reports (
        id, framework, tenant_id, time_range, generated_at, 
        status, findings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      report.id, report.framework, report.tenantId, report.timeRange,
      report.generatedAt, report.status, JSON.stringify(report.findings)
    ]);

    return report;
  }

  // Generate SOC 2 compliance report
  async generateSOC2Report(tenantId, timeRange) {
    const findings = [];

    // CC6.1 - Logical and Physical Access Controls
    const accessControlFindings = await database.pgPool.query(`
      SELECT 
        COUNT(*) as total_access_attempts,
        COUNT(*) FILTER (WHERE success = false) as failed_attempts,
        COUNT(DISTINCT user_id) as unique_users
      FROM authentication_logs 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${timeRange}'
      ${tenantId ? 'AND tenant_id = $1' : ''}
    `, tenantId ? [tenantId] : []);

    findings.push({
      control: 'CC6.1',
      description: 'Logical and Physical Access Controls',
      compliant: accessControlFindings.rows[0].failed_attempts < accessControlFindings.rows[0].total_access_attempts * 0.05,
      details: accessControlFindings.rows[0]
    });

    // CC7.1 - System Operations
    const systemHealthFindings = await database.pgPool.query(`
      SELECT 
        COUNT(*) as total_incidents,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_incidents,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) as avg_resolution_time
      FROM security_incidents 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${timeRange}'
    `);

    findings.push({
      control: 'CC7.1',
      description: 'System Operations',
      compliant: systemHealthFindings.rows[0].critical_incidents === 0,
      details: systemHealthFindings.rows[0]
    });

    return findings;
  }

  // Vulnerability scanning
  async performVulnerabilityScans() {
    const scanResults = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: 'automated_security_scan',
      findings: []
    };

    // Check password policies
    const weakPasswords = await database.pgPool.query(`
      SELECT user_id, created_at FROM user_passwords 
      WHERE strength_score < 60 OR created_at < CURRENT_DATE - INTERVAL '90 days'
    `);

    if (weakPasswords.rows.length > 0) {
      scanResults.findings.push({
        severity: 'medium',
        category: 'password_policy',
        description: `${weakPasswords.rows.length} users have weak or outdated passwords`,
        recommendation: 'Enforce strong password policy and regular password rotation'
      });
    }

    // Check for unused accounts
    const inactiveAccounts = await database.pgPool.query(`
      SELECT user_id FROM users 
      WHERE last_login < CURRENT_DATE - INTERVAL '90 days'
      AND is_active = true
    `);

    if (inactiveAccounts.rows.length > 0) {
      scanResults.findings.push({
        severity: 'low',
        category: 'account_management',
        description: `${inactiveAccounts.rows.length} accounts inactive for over 90 days`,
        recommendation: 'Review and disable inactive accounts'
      });
    }

    // Check encryption compliance
    const unencryptedData = await database.pgPool.query(`
      SELECT COUNT(*) as count FROM file_uploads 
      WHERE encryption_status IS NULL OR encryption_status = 'none'
    `);

    if (unencryptedData.rows[0].count > 0) {
      scanResults.findings.push({
        severity: 'high',
        category: 'data_encryption',
        description: `${unencryptedData.rows[0].count} files stored without encryption`,
        recommendation: 'Encrypt all stored files according to data classification policy'
      });
    }

    // Store scan results
    await database.pgPool.query(`
      INSERT INTO security_scans (
        id, timestamp, type, findings
      ) VALUES ($1, $2, $3, $4)
    `, [
      scanResults.id, scanResults.timestamp, scanResults.type,
      JSON.stringify(scanResults.findings)
    ]);

    return scanResults;
  }

  // Data retention policy enforcement
  async enforceDataRetention() {
    const policies = await database.pgPool.query(`
      SELECT * FROM data_retention_policies WHERE is_active = true
    `);

    for (const policy of policies.rows) {
      const retentionPeriod = policy.retention_days;
      const cutoffDate = new Date(Date.now() - retentionPeriod * 24 * 60 * 60 * 1000);

      switch (policy.data_type) {
        case 'audit_logs':
          await database.pgPool.query(`
            DELETE FROM audit_logs 
            WHERE timestamp < $1 AND classification = $2
          `, [cutoffDate, policy.classification]);
          break;

        case 'user_sessions':
          await database.pgPool.query(`
            DELETE FROM user_sessions 
            WHERE logout_time < $1
          `, [cutoffDate]);
          break;

        case 'temporary_files':
          await database.pgPool.query(`
            DELETE FROM file_uploads 
            WHERE created_at < $1 AND file_type = 'temporary'
          `, [cutoffDate]);
          break;
      }

      await this.auditLogger.log('data_retention_enforced', 'system', {
        policy: policy.name,
        cutoffDate: cutoffDate,
        dataType: policy.data_type
      });
    }
  }

  // Compliance dashboard metrics
  async getComplianceDashboard(tenantId = null) {
    const dashboard = {
      timestamp: new Date(),
      tenantId: tenantId,
      metrics: {}
    };

    // Security incidents
    const incidents = await database.pgPool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE status = 'open') as open
      FROM security_incidents 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      ${tenantId ? 'AND tenant_id = $1' : ''}
    `, tenantId ? [tenantId] : []);

    dashboard.metrics.security_incidents = incidents.rows[0];

    // Data subject requests (GDPR)
    const gdprRequests = await database.pgPool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/86400) as avg_resolution_days
      FROM gdpr_requests 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);

    dashboard.metrics.gdpr_requests = gdprRequests.rows[0];

    // Encryption compliance
    const encryptionStatus = await database.pgPool.query(`
      SELECT 
        COUNT(*) as total_files,
        COUNT(*) FILTER (WHERE encryption_status = 'encrypted') as encrypted_files,
        (COUNT(*) FILTER (WHERE encryption_status = 'encrypted')::float / COUNT(*)) * 100 as encryption_percentage
      FROM file_uploads
      ${tenantId ? 'WHERE tenant_id = $1' : ''}
    `, tenantId ? [tenantId] : []);

    dashboard.metrics.encryption_compliance = encryptionStatus.rows[0];

    return dashboard;
  }
}

module.exports = ComplianceManager;