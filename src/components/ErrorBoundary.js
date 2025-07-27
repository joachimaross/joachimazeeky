import React from 'react';
import { motion } from 'framer-motion';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // Report error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  reportError = (error, errorInfo) => {
    // In production, send error to monitoring service (Sentry, LogRocket, etc.)
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.props.userId || 'anonymous'
      };

      // Example: Send to your error reporting service
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });

      console.log('Error report:', errorReport);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Different fallback UIs based on error type and component
    const errorType = this.getErrorType();
    const FallbackComponent = this.getFallbackComponent(errorType);

    return (
      <FallbackComponent
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        retryCount={this.state.retryCount}
        onRetry={this.handleRetry}
        onReload={this.handleReload}
        componentName={this.props.componentName}
      />
    );
  }

  getErrorType() {
    const error = this.state.error;
    
    if (!error) return 'unknown';
    
    if (error.message?.includes('API') || error.message?.includes('fetch')) {
      return 'api';
    }
    
    if (error.message?.includes('TensorFlow') || error.message?.includes('model')) {
      return 'ml';
    }
    
    if (error.message?.includes('Canvas') || error.message?.includes('WebGL')) {
      return 'graphics';
    }
    
    if (error.message?.includes('Audio') || error.message?.includes('microphone')) {
      return 'audio';
    }
    
    return 'generic';
  }

  getFallbackComponent(errorType) {
    switch (errorType) {
      case 'api':
        return APIErrorFallback;
      case 'ml':
        return MLErrorFallback;
      case 'graphics':
        return GraphicsErrorFallback;
      case 'audio':
        return AudioErrorFallback;
      default:
        return GenericErrorFallback;
    }
  }
}

// API Error Fallback
const APIErrorFallback = ({ error, onRetry, retryCount, componentName }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg"
  >
    <div className="text-red-600 text-4xl mb-4">🔌</div>
    <h3 className="text-lg font-semibold text-red-800 mb-2">
      AI Service Connection Issue
    </h3>
    <p className="text-red-600 text-center mb-4">
      I'm having trouble connecting to my AI brain. This usually resolves quickly.
    </p>
    <div className="flex gap-3">
      <button
        onClick={onRetry}
        disabled={retryCount >= 3}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {retryCount >= 3 ? 'Max Retries Reached' : `Try Again (${retryCount + 1}/3)`}
      </button>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
      >
        Refresh Page
      </button>
    </div>
    {process.env.NODE_ENV === 'development' && (
      <details className="mt-4 w-full">
        <summary className="cursor-pointer text-sm text-red-600">
          Error Details (Development)
        </summary>
        <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
          {error?.stack}
        </pre>
      </details>
    )}
  </motion.div>
);

// Machine Learning Error Fallback
const MLErrorFallback = ({ error, onRetry, componentName }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg"
  >
    <div className="text-yellow-600 text-4xl mb-4">🧠</div>
    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
      Vision System Unavailable
    </h3>
    <p className="text-yellow-700 text-center mb-4">
      My visual recognition is temporarily offline. Other features still work!
    </p>
    <div className="flex gap-3">
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
      >
        Try Reloading Vision
      </button>
      <button
        onClick={() => {
          // Continue without vision features
          window.dispatchEvent(new CustomEvent('disableVisionFeatures'));
        }}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
      >
        Continue Without Vision
      </button>
    </div>
  </motion.div>
);

// Graphics Error Fallback
const GraphicsErrorFallback = ({ error, onRetry }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center p-6 bg-blue-50 border border-blue-200 rounded-lg"
  >
    <div className="text-blue-600 text-4xl mb-4">🎨</div>
    <h3 className="text-lg font-semibold text-blue-800 mb-2">
      Graphics System Issue
    </h3>
    <p className="text-blue-700 text-center mb-4">
      Avatar rendering is having issues. Let me switch to text mode.
    </p>
    <button
      onClick={onRetry}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Try Again
    </button>
  </motion.div>
);

// Audio Error Fallback
const AudioErrorFallback = ({ error, onRetry }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center p-6 bg-purple-50 border border-purple-200 rounded-lg"
  >
    <div className="text-purple-600 text-4xl mb-4">🎤</div>
    <h3 className="text-lg font-semibold text-purple-800 mb-2">
      Audio System Issue
    </h3>
    <p className="text-purple-700 text-center mb-4">
      Voice features are temporarily unavailable. You can still chat with text!
    </p>
    <div className="flex gap-3">
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        Try Voice Again
      </button>
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent('switchToTextMode'));
        }}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
      >
        Use Text Mode
      </button>
    </div>
  </motion.div>
);

// Generic Error Fallback
const GenericErrorFallback = ({ error, onRetry, onReload, componentName }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center p-6 bg-gray-50 border border-gray-200 rounded-lg"
  >
    <div className="text-gray-600 text-4xl mb-4">⚠️</div>
    <h3 className="text-lg font-semibold text-gray-800 mb-2">
      Oops! Something went wrong
    </h3>
    <p className="text-gray-600 text-center mb-4">
      {componentName ? `The ${componentName} component` : 'A component'} encountered an unexpected error.
    </p>
    <div className="flex gap-3">
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Try Again
      </button>
      <button
        onClick={onReload}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
      >
        Refresh Page
      </button>
    </div>
    <div className="mt-4 text-sm text-gray-500">
      If this keeps happening, please try refreshing the page or contact support.
    </div>
  </motion.div>
);

// Specialized Error Boundary for specific components
export const AIServiceErrorBoundary = ({ children, userId }) => (
  <ErrorBoundary componentName="AI Service" userId={userId}>
    {children}
  </ErrorBoundary>
);

export const AvatarErrorBoundary = ({ children, userId }) => (
  <ErrorBoundary componentName="Avatar" userId={userId}>
    {children}
  </ErrorBoundary>
);

export const VoiceErrorBoundary = ({ children, userId }) => (
  <ErrorBoundary componentName="Voice System" userId={userId}>
    {children}
  </ErrorBoundary>
);

export const MusicErrorBoundary = ({ children, userId }) => (
  <ErrorBoundary componentName="Music Generator" userId={userId}>
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;