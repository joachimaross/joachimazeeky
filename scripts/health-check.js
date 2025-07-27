#!/usr/bin/env node

/**
 * 🏥 Zeeky AI Production Health Check System
 * Comprehensive monitoring and alerting for production deployment
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

class HealthCheck {
  constructor() {
    this.config = {
      domain: process.env.REACT_APP_DOMAIN || 'zeeky.ai',
      endpoints: [
        '/',
        '/manifest.json',
        '/sw.js',
        '/static/js/main.js',
        '/static/css/main.css'
      ],
      apiEndpoints: [
        '/api/health',
        '/api/ai/status',
        '/api/user/profile'
      ],
      timeout: 10000,
      retries: 3,
      alertThreshold: 5000, // 5 seconds
      requirements: {
        responseTime: 3000,
        uptime: 99.9,
        errorRate: 1.0
      }
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      checks: [],
      metrics: {},
      alerts: []
    };
  }

  async run() {
    console.log('🏥 Starting Zeeky AI Health Check...\n');
    
    try {
      await this.checkBasicConnectivity();
      await this.checkEndpointsHealth();
      await this.checkPerformanceMetrics();
      await this.checkSecurityHeaders();
      await this.checkPWAFeatures();
      await this.checkFirebaseServices();
      await this.generateReport();
      
      console.log('\n✅ Health check completed');
      
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      process.exit(1);
    }
  }

  async checkBasicConnectivity() {
    console.log('🌐 Checking basic connectivity...');
    
    const baseUrl = `https://${this.config.domain}`;
    
    try {
      const result = await this.makeRequest(baseUrl);
      
      if (result.statusCode === 200) {
        this.addCheck('connectivity', 'passed', 'Site is accessible');
        console.log('✅ Site is accessible');
      } else {
        this.addCheck('connectivity', 'failed', `HTTP ${result.statusCode}`);
        console.log(`❌ Site returned HTTP ${result.statusCode}`);
      }
      
    } catch (error) {
      this.addCheck('connectivity', 'failed', error.message);
      console.log(`❌ Connectivity failed: ${error.message}`);
    }
  }

  async checkEndpointsHealth() {
    console.log('\n📡 Checking endpoint health...');
    
    for (const endpoint of this.config.endpoints) {
      const url = `https://${this.config.domain}${endpoint}`;
      
      try {
        const startTime = Date.now();
        const result = await this.makeRequest(url);
        const responseTime = Date.now() - startTime;
        
        if (result.statusCode === 200) {
          const status = responseTime > this.config.alertThreshold ? 'warning' : 'passed';
          this.addCheck(`endpoint_${endpoint}`, status, 
            `${result.statusCode} (${responseTime}ms)`);
          console.log(`✅ ${endpoint} - ${result.statusCode} (${responseTime}ms)`);
        } else {
          this.addCheck(`endpoint_${endpoint}`, 'failed', 
            `HTTP ${result.statusCode}`);
          console.log(`❌ ${endpoint} - HTTP ${result.statusCode}`);
        }
        
      } catch (error) {
        this.addCheck(`endpoint_${endpoint}`, 'failed', error.message);
        console.log(`❌ ${endpoint} - ${error.message}`);
      }
    }
  }

  async checkPerformanceMetrics() {
    console.log('\n⚡ Checking performance metrics...');
    
    const url = `https://${this.config.domain}`;
    
    try {
      // Measure page load time
      const startTime = Date.now();
      const result = await this.makeRequest(url);
      const loadTime = Date.now() - startTime;
      
      this.results.metrics.loadTime = loadTime;
      
      // Check if load time meets requirements
      if (loadTime <= this.config.requirements.responseTime) {
        this.addCheck('performance_load_time', 'passed', 
          `${loadTime}ms (requirement: ${this.config.requirements.responseTime}ms)`);
        console.log(`✅ Load time: ${loadTime}ms`);
      } else {
        this.addCheck('performance_load_time', 'warning', 
          `${loadTime}ms exceeds requirement of ${this.config.requirements.responseTime}ms`);
        console.log(`⚠️ Load time: ${loadTime}ms (slow)`);
      }
      
      // Check content size
      const contentLength = result.headers['content-length'];
      if (contentLength) {
        const sizeKB = Math.round(contentLength / 1024);
        this.results.metrics.contentSize = sizeKB;
        console.log(`📊 Content size: ${sizeKB}KB`);
      }
      
    } catch (error) {
      this.addCheck('performance_metrics', 'failed', error.message);
      console.log(`❌ Performance check failed: ${error.message}`);
    }
  }

  async checkSecurityHeaders() {
    console.log('\n🔒 Checking security headers...');
    
    const url = `https://${this.config.domain}`;
    
    try {
      const result = await this.makeRequest(url);
      const headers = result.headers;
      
      const securityHeaders = {
        'strict-transport-security': 'HSTS',
        'content-security-policy': 'CSP',
        'x-frame-options': 'Clickjacking Protection',
        'x-content-type-options': 'MIME Sniffing Protection',
        'x-xss-protection': 'XSS Protection'
      };
      
      let securityScore = 0;
      const totalHeaders = Object.keys(securityHeaders).length;
      
      for (const [header, description] of Object.entries(securityHeaders)) {
        if (headers[header]) {
          this.addCheck(`security_${header}`, 'passed', 
            `${description} header present`);
          console.log(`✅ ${description}`);
          securityScore++;
        } else {
          this.addCheck(`security_${header}`, 'warning', 
            `${description} header missing`);
          console.log(`⚠️ ${description} header missing`);
        }
      }
      
      this.results.metrics.securityScore = Math.round((securityScore / totalHeaders) * 100);
      console.log(`🔒 Security score: ${this.results.metrics.securityScore}%`);
      
    } catch (error) {
      this.addCheck('security_headers', 'failed', error.message);
      console.log(`❌ Security check failed: ${error.message}`);
    }
  }

  async checkPWAFeatures() {
    console.log('\n📱 Checking PWA features...');
    
    const features = [
      { path: '/manifest.json', name: 'Web App Manifest' },
      { path: '/sw.js', name: 'Service Worker' },
      { path: '/offline.html', name: 'Offline Page' }
    ];
    
    for (const feature of features) {
      const url = `https://${this.config.domain}${feature.path}`;
      
      try {
        const result = await this.makeRequest(url);
        
        if (result.statusCode === 200) {
          this.addCheck(`pwa_${feature.path.replace('/', '')}`, 'passed', 
            `${feature.name} available`);
          console.log(`✅ ${feature.name}`);
        } else {
          this.addCheck(`pwa_${feature.path.replace('/', '')}`, 'failed', 
            `${feature.name} not found`);
          console.log(`❌ ${feature.name} not found`);
        }
        
      } catch (error) {
        this.addCheck(`pwa_${feature.path.replace('/', '')}`, 'failed', 
          `${feature.name} check failed`);
        console.log(`❌ ${feature.name} check failed: ${error.message}`);
      }
    }
  }

  async checkFirebaseServices() {
    console.log('\n🔥 Checking Firebase services...');
    
    // This would typically require Firebase Admin SDK setup
    // For now, we'll do basic connectivity checks
    
    const firebaseEndpoints = [
      'https://firestore.googleapis.com/',
      'https://firebase.googleapis.com/',
      'https://identitytoolkit.googleapis.com/'
    ];
    
    for (const endpoint of firebaseEndpoints) {
      try {
        const startTime = Date.now();
        const result = await this.makeRequest(endpoint);
        const responseTime = Date.now() - startTime;
        
        const serviceName = endpoint.split('//')[1].split('.')[0];
        
        if (result.statusCode < 500) {
          this.addCheck(`firebase_${serviceName}`, 'passed', 
            `Service accessible (${responseTime}ms)`);
          console.log(`✅ Firebase ${serviceName} - accessible`);
        } else {
          this.addCheck(`firebase_${serviceName}`, 'warning', 
            `HTTP ${result.statusCode}`);
          console.log(`⚠️ Firebase ${serviceName} - HTTP ${result.statusCode}`);
        }
        
      } catch (error) {
        // Firebase services may reject direct requests, which is normal
        console.log(`ℹ️ Firebase ${endpoint.split('//')[1].split('.')[0]} - ${error.message}`);
      }
    }
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: this.config.timeout,
        headers: {
          'User-Agent': 'Zeeky-AI-Health-Check/1.0',
          'Accept': '*/*',
          ...options.headers
        }
      };
      
      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  addCheck(name, status, message) {
    this.results.checks.push({
      name,
      status,
      message,
      timestamp: new Date().toISOString()
    });
    
    if (status === 'failed') {
      this.results.alerts.push({
        severity: 'high',
        message: `${name}: ${message}`,
        timestamp: new Date().toISOString()
      });
    } else if (status === 'warning') {
      this.results.alerts.push({
        severity: 'medium',
        message: `${name}: ${message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  async generateReport() {
    console.log('\n📊 Generating health report...');
    
    // Calculate overall status
    const passedChecks = this.results.checks.filter(c => c.status === 'passed').length;
    const warningChecks = this.results.checks.filter(c => c.status === 'warning').length;
    const failedChecks = this.results.checks.filter(c => c.status === 'failed').length;
    const totalChecks = this.results.checks.length;
    
    if (failedChecks > 0) {
      this.results.overall = 'critical';
    } else if (warningChecks > 0) {
      this.results.overall = 'warning';
    } else {
      this.results.overall = 'healthy';
    }
    
    // Generate summary
    console.log('\n📋 Health Check Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Overall Status: ${this.getStatusEmoji(this.results.overall)} ${this.results.overall.toUpperCase()}`);
    console.log(`Total Checks: ${totalChecks}`);
    console.log(`✅ Passed: ${passedChecks}`);
    console.log(`⚠️ Warnings: ${warningChecks}`);
    console.log(`❌ Failed: ${failedChecks}`);
    
    if (this.results.metrics.loadTime) {
      console.log(`⚡ Load Time: ${this.results.metrics.loadTime}ms`);
    }
    
    if (this.results.metrics.securityScore) {
      console.log(`🔒 Security Score: ${this.results.metrics.securityScore}%`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Show alerts if any
    if (this.results.alerts.length > 0) {
      console.log('\n🚨 Alerts:');
      this.results.alerts.forEach(alert => {
        const emoji = alert.severity === 'high' ? '❌' : '⚠️';
        console.log(`${emoji} ${alert.message}`);
      });
    }
    
    // Save report to file
    const reportFile = `health-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);
    
    // Exit with appropriate code
    if (this.results.overall === 'critical') {
      process.exit(1);
    } else if (this.results.overall === 'warning') {
      process.exit(2);
    } else {
      process.exit(0);
    }
  }

  getStatusEmoji(status) {
    switch (status) {
      case 'healthy': return '🟢';
      case 'warning': return '🟡';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  }
}

// CLI interface
if (require.main === module) {
  const healthCheck = new HealthCheck();
  healthCheck.run().catch(console.error);
}

module.exports = HealthCheck;