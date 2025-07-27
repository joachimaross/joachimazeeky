import React from 'react';
import { auth, db } from '../firebase-config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

class ErrorReportingService {
  constructor() {
    this.isInitialized = false;
    this.errorQueue = [];
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.init();
  }

  init() {
    // Set up global error handlers
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // Initialize console error tracking
    this.setupConsoleErrorTracking();
    
    this.isInitialized = true;
    console.log('✅ Error Reporting Service initialized');
  }

  // Handle global JavaScript errors
  handleGlobalError(event) {
    const errorInfo = {
      type: 'javascript_error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.reportError(errorInfo);
  }

  // Handle unhandled promise rejections
  handleUnhandledRejection(event) {
    const errorInfo = {
      type: 'unhandled_rejection',
      message: event.reason?.message || 'Unhandled Promise Rejection',
      reason: event.reason,
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.reportError(errorInfo);
  }

  // Track console errors
  setupConsoleErrorTracking() {
    const originalConsoleError = console.error;
    
    console.error = (...args) => {
      // Call original console.error
      originalConsoleError.apply(console, args);
      
      // Report critical console errors
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      if (this.shouldReportConsoleError(message)) {
        this.reportError({
          type: 'console_error',
          message,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      }
    };
  }

  // Determine if console error should be reported
  shouldReportConsoleError(message) {
    const criticalPatterns = [
      'firebase',
      'authentication',
      'permission',
      'network',
      'api',
      'security',
      'cors',
      'unauthorized'
    ];

    return criticalPatterns.some(pattern => 
      message.toLowerCase().includes(pattern)
    );
  }

  // Main error reporting function
  async reportError(errorInfo, context = {}) {
    try {
      const user = auth.currentUser;
      
      const errorReport = {
        ...errorInfo,
        ...context,
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || 'anonymous',
        sessionId: this.getSessionId(),
        deviceInfo: this.getDeviceInfo(),
        networkInfo: this.getNetworkInfo(),
        timestamp: serverTimestamp(),
        environment: process.env.NODE_ENV || 'unknown',
        version: process.env.REACT_APP_VERSION || 'unknown',
        buildNumber: process.env.REACT_APP_BUILD_NUMBER || 'unknown'
      };

      // Store in Firebase if available
      if (db) {
        await addDoc(collection(db, 'error_reports'), errorReport);
      } else {
        // Queue for later if Firebase not available
        this.errorQueue.push(errorReport);
      }

      // Send to external monitoring service in production
      if (process.env.NODE_ENV === 'production') {
        await this.sendToMonitoringService(errorReport);
      }

      console.log('📊 Error reported:', errorReport);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
      // Add to queue for retry
      this.errorQueue.push(errorInfo);
    }
  }

  // Send to external monitoring service (Sentry, LogRocket, etc.)
  async sendToMonitoringService(errorReport) {
    try {
      // Example: Send to Sentry
      if (window.Sentry) {
        window.Sentry.captureException(new Error(errorReport.message), {
          tags: {
            type: errorReport.type,
            userId: errorReport.userId,
            environment: errorReport.environment
          },
          extra: errorReport
        });
      }

      // Example: Send to custom monitoring endpoint
      const monitoringEndpoint = process.env.REACT_APP_MONITORING_ENDPOINT;
      if (monitoringEndpoint) {
        await fetch(monitoringEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_MONITORING_TOKEN}`
          },
          body: JSON.stringify(errorReport)
        });
      }
    } catch (error) {
      console.error('Failed to send to monitoring service:', error);
    }
  }

  // Get session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('zeeky_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('zeeky_session_id', sessionId);
    }
    return sessionId;
  }

  // Get device information
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  // Get network information
  getNetworkInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    return {
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
      type: connection?.type
    };
  }

  // Report performance issues
  reportPerformanceIssue(metric, value, threshold) {
    if (value > threshold) {
      this.reportError({
        type: 'performance_issue',
        metric,
        value,
        threshold,
        message: `Performance threshold exceeded: ${metric} = ${value} (threshold: ${threshold})`
      });
    }
  }

  // Report security events
  reportSecurityEvent(eventType, details) {
    this.reportError({
      type: 'security_event',
      eventType,
      message: `Security event: ${eventType}`,
      severity: 'high'
    }, details);
  }

  // Report admin events
  reportAdminEvent(action, target, details = {}) {
    this.reportError({
      type: 'admin_event',
      action,
      target,
      message: `Admin action: ${action} on ${target}`,
      severity: 'medium'
    }, details);
  }

  // Retry failed error reports
  async retryFailedReports() {
    const failedReports = [...this.errorQueue];
    this.errorQueue = [];

    for (const report of failedReports) {
      try {
        await this.reportError(report);
      } catch (error) {
        // Re-queue if still failing
        if (report.retryCount < this.maxRetries) {
          report.retryCount = (report.retryCount || 0) + 1;
          setTimeout(() => {
            this.errorQueue.push(report);
          }, this.retryDelay * report.retryCount);
        }
      }
    }
  }

  // Get error statistics
  async getErrorStatistics(timeRange = '24h') {
    try {
      if (!db) return null;

      const user = auth.currentUser;
      if (!user) return null;

      // This would typically be implemented as a cloud function
      // for better performance and security
      const response = await fetch('/api/admin/error-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ timeRange })
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to get error statistics:', error);
      return null;
    }
  }

  // Test error reporting
  testErrorReporting() {
    if (process.env.NODE_ENV !== 'production') {
      this.reportError({
        type: 'test_error',
        message: 'This is a test error to verify error reporting is working',
        testData: {
          timestamp: new Date().toISOString(),
          testId: Math.random().toString(36).substr(2, 9)
        }
      });
      console.log('🧪 Test error report sent');
    }
  }

  // Clean up
  destroy() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    this.isInitialized = false;
  }
}

// Enhanced error boundary HOC for admin components
export const withAdminErrorBoundary = (WrappedComponent, componentName) => {
  return class extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      errorReportingService.reportAdminEvent('component_error', componentName, {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }

    render() {
      if (this.state.hasError) {
        return (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Admin Component Error
            </h3>
            <p className="text-red-600 mb-4">
              The {componentName} component encountered an error and has been disabled for safety.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry Component
            </button>
          </div>
        );
      }

      return <WrappedComponent {...this.props} />;
    }
  };
};

// Create singleton instance
const errorReportingService = new ErrorReportingService();

export default errorReportingService;
