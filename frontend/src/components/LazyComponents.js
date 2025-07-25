// Lazy loading components for code splitting and better performance
import React, { Suspense, lazy } from 'react';

// Loading component for better UX during lazy loads
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="flex items-center justify-center min-h-[200px] bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg backdrop-blur-sm">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
      <p className="text-purple-300 font-medium">{message}</p>
    </div>
  </div>
);

// Lazy load major components for code splitting
export const Dashboard = lazy(() => 
  import('./Dashboard').catch(() => ({ default: () => <div>Failed to load Dashboard</div> }))
);

export const ChatInterface = lazy(() => 
  import('./ChatInterface').catch(() => ({ default: () => <div>Failed to load Chat</div> }))
);

export const ZeekyAvatar = lazy(() => 
  import('../../../client/src/components/ZeekyAvatar').catch(() => ({ 
    default: () => <div>Failed to load Avatar</div> 
  }))
);

export const MusicPlayer = lazy(() => 
  import('./MusicPlayer').catch(() => ({ default: () => <div>Failed to load Music Player</div> }))
);

export const WeatherWidget = lazy(() => 
  import('./WeatherWidget').catch(() => ({ default: () => <div>Failed to load Weather</div> }))
);

export const CalendarWidget = lazy(() => 
  import('./CalendarWidget').catch(() => ({ default: () => <div>Failed to load Calendar</div> }))
);

export const NewsWidget = lazy(() => 
  import('./NewsWidget').catch(() => ({ default: () => <div>Failed to load News</div> }))
);

export const FitnessWidget = lazy(() => 
  import('./FitnessWidget').catch(() => ({ default: () => <div>Failed to load Fitness</div> }))
);

export const NotesWidget = lazy(() => 
  import('./NotesWidget').catch(() => ({ default: () => <div>Failed to load Notes</div> }))
);

export const SocialWidget = lazy(() => 
  import('./SocialWidget').catch(() => ({ default: () => <div>Failed to load Social</div> }))
);

export const SurvivalWidget = lazy(() => 
  import('./SurvivalWidget').catch(() => ({ default: () => <div>Failed to load Survival</div> }))
);

// Business components lazy loading
export const BusinessDashboard = lazy(() => 
  import('./business/BusinessDashboard').catch(() => ({ 
    default: () => <div>Failed to load Business Dashboard</div> 
  }))
);

export const CRMSystem = lazy(() => 
  import('./business/CRMSystem').catch(() => ({ 
    default: () => <div>Failed to load CRM</div> 
  }))
);

export const InvoiceManager = lazy(() => 
  import('./business/InvoiceManager').catch(() => ({ 
    default: () => <div>Failed to load Invoice Manager</div> 
  }))
);

export const SchedulingSystem = lazy(() => 
  import('./business/SchedulingSystem').catch(() => ({ 
    default: () => <div>Failed to load Scheduling</div> 
  }))
);

// Advanced AI features lazy loading
export const VoiceCloning = lazy(() => 
  import('./ai/VoiceCloning').catch(() => ({ 
    default: () => <div>Failed to load Voice Cloning</div> 
  }))
);

export const ImageGenerator = lazy(() => 
  import('./ai/ImageGenerator').catch(() => ({ 
    default: () => <div>Failed to load Image Generator</div> 
  }))
);

export const CodeAssistant = lazy(() => 
  import('./ai/CodeAssistant').catch(() => ({ 
    default: () => <div>Failed to load Code Assistant</div> 
  }))
);

export const DocumentProcessor = lazy(() => 
  import('./ai/DocumentProcessor').catch(() => ({ 
    default: () => <div>Failed to load Document Processor</div> 
  }))
);

// Wrapper components with Suspense
export const LazyDashboard = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Dashboard..." />}>
    <Dashboard {...props} />
  </Suspense>
);

export const LazyChatInterface = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Chat Interface..." />}>
    <ChatInterface {...props} />
  </Suspense>
);

export const LazyZeekyAvatar = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Zeeky Avatar..." />}>
    <ZeekyAvatar {...props} />
  </Suspense>
);

export const LazyMusicPlayer = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Music Player..." />}>
    <MusicPlayer {...props} />
  </Suspense>
);

export const LazyWeatherWidget = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Weather..." />}>
    <WeatherWidget {...props} />
  </Suspense>
);

export const LazyCalendarWidget = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Calendar..." />}>
    <CalendarWidget {...props} />
  </Suspense>
);

export const LazyNewsWidget = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading News..." />}>
    <NewsWidget {...props} />
  </Suspense>
);

export const LazyFitnessWidget = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Fitness Tracker..." />}>
    <FitnessWidget {...props} />
  </Suspense>
);

export const LazyNotesWidget = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Notes..." />}>
    <NotesWidget {...props} />
  </Suspense>
);

export const LazySocialWidget = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Social Feed..." />}>
    <SocialWidget {...props} />
  </Suspense>
);

export const LazySurvivalWidget = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Survival Guide..." />}>
    <SurvivalWidget {...props} />
  </Suspense>
);

// Business components with Suspense
export const LazyBusinessDashboard = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Business Dashboard..." />}>
    <BusinessDashboard {...props} />
  </Suspense>
);

export const LazyCRMSystem = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading CRM System..." />}>
    <CRMSystem {...props} />
  </Suspense>
);

export const LazyInvoiceManager = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Invoice Manager..." />}>
    <InvoiceManager {...props} />
  </Suspense>
);

export const LazySchedulingSystem = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Scheduling System..." />}>
    <SchedulingSystem {...props} />
  </Suspense>
);

// Advanced AI features with Suspense
export const LazyVoiceCloning = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Voice Cloning..." />}>
    <VoiceCloning {...props} />
  </Suspense>
);

export const LazyImageGenerator = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Image Generator..." />}>
    <ImageGenerator {...props} />
  </Suspense>
);

export const LazyCodeAssistant = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Code Assistant..." />}>
    <CodeAssistant {...props} />
  </Suspense>
);

export const LazyDocumentProcessor = (props) => (
  <Suspense fallback={<LoadingSpinner message="Loading Document Processor..." />}>
    <DocumentProcessor {...props} />
  </Suspense>
);

// Route-based lazy loading for better code splitting
export const createLazyRoute = (importFunc, fallbackMessage) => {
  const LazyComponent = lazy(importFunc);
  
  return (props) => (
    <Suspense fallback={<LoadingSpinner message={fallbackMessage} />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Performance monitoring for lazy loading
export const withLoadTimeTracking = (Component, componentName) => {
  return React.forwardRef((props, ref) => {
    React.useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        // Log slow loading components for optimization
        if (loadTime > 1000) {
          console.warn(`Slow component load: ${componentName} took ${loadTime.toFixed(2)}ms`);
        }
      };
    }, []);

    return <Component ref={ref} {...props} />;
  });
};