/**
 * 🏥 Netlify Function: Health Check
 * Provides real-time health monitoring for Zeeky AI platform
 */

exports.handler = async (event, context) => {
  const startTime = Date.now();
  
  try {
    // CORS headers for all responses
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    // Only allow GET requests for health checks
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Basic health checks
    const checks = [];
    
    // 1. Function execution check
    checks.push({
      name: 'function_execution',
      status: 'passed',
      message: 'Netlify function is operational',
      timestamp: new Date().toISOString()
    });

    // 2. Environment variables check
    const requiredEnvVars = [
      'REACT_APP_FIREBASE_PROJECT_ID',
      'REACT_APP_FIREBASE_API_KEY'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missingEnvVars.length === 0) {
      checks.push({
        name: 'environment_variables',
        status: 'passed',
        message: 'All required environment variables are set',
        timestamp: new Date().toISOString()
      });
    } else {
      checks.push({
        name: 'environment_variables',
        status: 'warning',
        message: `Missing environment variables: ${missingEnvVars.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // 3. Memory usage check
    const memoryUsage = process.memoryUsage();
    const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    checks.push({
      name: 'memory_usage',
      status: memoryMB < 100 ? 'passed' : 'warning',
      message: `Memory usage: ${memoryMB}MB`,
      timestamp: new Date().toISOString()
    });

    // 4. Response time check
    const responseTime = Date.now() - startTime;
    
    checks.push({
      name: 'response_time',
      status: responseTime < 1000 ? 'passed' : 'warning',
      message: `Response time: ${responseTime}ms`,
      timestamp: new Date().toISOString()
    });

    // Calculate overall status
    const failedChecks = checks.filter(c => c.status === 'failed').length;
    const warningChecks = checks.filter(c => c.status === 'warning').length;
    
    let overall = 'healthy';
    if (failedChecks > 0) {
      overall = 'critical';
    } else if (warningChecks > 0) {
      overall = 'warning';
    }

    // Build response
    const healthData = {
      status: overall,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'production',
      platform: 'netlify',
      deployment: {
        context: process.env.CONTEXT || 'production',
        branch: process.env.BRANCH || 'main',
        commit: process.env.COMMIT_REF || 'unknown'
      },
      metrics: {
        responseTime: `${responseTime}ms`,
        memoryUsage: `${memoryMB}MB`,
        uptime: process.uptime(),
        nodeVersion: process.version
      },
      checks,
      summary: {
        total: checks.length,
        passed: checks.filter(c => c.status === 'passed').length,
        warnings: warningChecks,
        failed: failedChecks
      }
    };

    return {
      statusCode: overall === 'critical' ? 503 : 200,
      headers,
      body: JSON.stringify(healthData, null, 2)
    };

  } catch (error) {
    console.error('Health check error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'critical',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error.message,
        responseTime: `${Date.now() - startTime}ms`
      })
    };
  }
};