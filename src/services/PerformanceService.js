class PerformanceService {
  constructor() {
    this.metrics = {
      loadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      timeToInteractive: 0
    };
    
    this.observers = new Map();
    this.resourceTimings = [];
    this.isInitialized = false;
    
    this.init();
  }

  init() {
    // Initialize performance monitoring
    this.setupPerformanceObservers();
    this.measureLoadMetrics();
    this.setupResourceMonitoring();
    this.setupErrorTracking();
    
    // Start monitoring
    this.startMonitoring();
    
    this.isInitialized = true;
    console.log('📊 Performance Service initialized');
  }

  // Setup performance observers
  setupPerformanceObservers() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.largestContentfulPaint = lastEntry.startTime;
          this.reportMetric('lcp', lastEntry.startTime);
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
            this.reportMetric('fid', this.metrics.firstInputDelay);
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.metrics.cumulativeLayoutShift = clsValue;
          this.reportMetric('cls', clsValue);
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }

      // Long Tasks
      try {
        const longTaskObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            if (entry.duration > 50) {
              this.reportLongTask(entry);
            }
          });
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }
    }
  }

  // Measure load metrics
  measureLoadMetrics() {
    window.addEventListener('load', () => {
      // Page load time
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        this.metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart;
        this.reportMetric('load_time', this.metrics.loadTime);
      }

      // First Contentful Paint
      setTimeout(() => {
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          this.metrics.firstContentfulPaint = fcpEntry.startTime;
          this.reportMetric('fcp', fcpEntry.startTime);
        }
      }, 0);
    });
  }

  // Setup resource monitoring
  setupResourceMonitoring() {
    // Monitor resource loading
    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource');
      
      resources.forEach((resource) => {
        this.resourceTimings.push({
          name: resource.name,
          duration: resource.duration,
          size: resource.transferSize,
          type: this.getResourceType(resource.name),
          startTime: resource.startTime
        });
      });

      this.analyzeResourcePerformance();
    });
  }

  // Setup error tracking
  setupErrorTracking() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError({
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        type: 'unhandled_rejection',
        message: event.reason?.message || 'Unhandled Promise Rejection',
        reason: event.reason
      });
    });
  }

  // Start continuous monitoring
  startMonitoring() {
    // Monitor memory usage
    setInterval(() => {
      this.monitorMemoryUsage();
    }, 30000); // Every 30 seconds

    // Monitor network conditions
    if ('connection' in navigator) {
      this.monitorNetworkConditions();
    }

    // Monitor frame rate
    this.monitorFrameRate();

    // Monitor CPU usage
    this.monitorCPUUsage();
  }

  // Monitor memory usage
  monitorMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      const memoryInfo = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      };

      // Report if memory usage is high
      if (memoryInfo.percentage > 80) {
        this.reportHighMemoryUsage(memoryInfo);
      }

      return memoryInfo;
    }
    return null;
  }

  // Monitor network conditions
  monitorNetworkConditions() {
    const connection = navigator.connection;
    
    const networkInfo = {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };

    // Adjust performance based on network
    this.adaptToNetworkConditions(networkInfo);

    return networkInfo;
  }

  // Monitor frame rate
  monitorFrameRate() {
    let frames = 0;
    let lastTime = performance.now();

    const countFrames = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime > lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        
        // Report low frame rate
        if (fps < 30) {
          this.reportLowFrameRate(fps);
        }
        
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(countFrames);
    };

    requestAnimationFrame(countFrames);
  }

  // Monitor CPU usage (experimental)
  monitorCPUUsage() {
    let lastTaskTime = 0;
    
    const measureCPU = () => {
      const start = performance.now();
      
      // Simulate a small CPU task
      setTimeout(() => {
        const end = performance.now();
        const taskTime = end - start;
        const cpuUsage = Math.max(0, 100 - (taskTime / 16.67 * 100)); // Based on 60fps
        
        if (cpuUsage < 50) {
          this.reportHighCPUUsage(cpuUsage);
        }
        
        lastTaskTime = taskTime;
      }, 0);
    };

    setInterval(measureCPU, 5000); // Every 5 seconds
  }

  // Analyze resource performance
  analyzeResourcePerformance() {
    const slowResources = this.resourceTimings.filter(resource => resource.duration > 1000);
    const largeResources = this.resourceTimings.filter(resource => resource.size > 1024 * 1024); // > 1MB

    if (slowResources.length > 0) {
      this.reportSlowResources(slowResources);
    }

    if (largeResources.length > 0) {
      this.reportLargeResources(largeResources);
    }
  }

  // Get resource type
  getResourceType(url) {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    return 'other';
  }

  // Adapt to network conditions
  adaptToNetworkConditions(networkInfo) {
    const settings = {
      reducedAnimations: false,
      reducedQuality: false,
      preloadDisabled: false
    };

    // Slow connections
    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
      settings.reducedAnimations = true;
      settings.reducedQuality = true;
      settings.preloadDisabled = true;
    }

    // Save data mode
    if (networkInfo.saveData) {
      settings.reducedAnimations = true;
      settings.preloadDisabled = true;
    }

    this.applyPerformanceSettings(settings);
  }

  // Apply performance settings
  applyPerformanceSettings(settings) {
    // Dispatch custom event for components to react
    window.dispatchEvent(new CustomEvent('performance-settings-update', {
      detail: settings
    }));

    // Apply global optimizations
    if (settings.reducedAnimations) {
      document.body.classList.add('reduced-motion');
    }

    if (settings.reducedQuality) {
      document.body.classList.add('reduced-quality');
    }
  }

  // Preload critical resources
  preloadCriticalResources() {
    const criticalResources = [
      '/static/css/main.css',
      '/static/js/main.js',
      '/logo192.png'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      
      if (resource.endsWith('.css')) {
        link.as = 'style';
      } else if (resource.endsWith('.js')) {
        link.as = 'script';
      } else if (resource.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
        link.as = 'image';
      }
      
      document.head.appendChild(link);
    });
  }

  // Lazy load images
  setupLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      // Observe all images with data-src
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  // Optimize images
  optimizeImages() {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      // Add loading="lazy" for modern browsers
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }

      // Suggest WebP format if supported
      if (this.supportsWebP() && !img.src.includes('.webp')) {
        const webpSrc = img.src.replace(/\.(jpg|jpeg|png)$/, '.webp');
        img.src = webpSrc;
      }
    });
  }

  // Check WebP support
  supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('webp') !== -1;
  }

  // Bundle splitting optimization
  dynamicImport(modulePath) {
    return import(modulePath).catch(error => {
      console.error('Dynamic import failed:', error);
      throw error;
    });
  }

  // Report metrics
  reportMetric(name, value) {
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: value,
        custom_map: { metric_1: name }
      });
    }

    // Send to custom endpoint
    this.sendMetricToServer(name, value);
  }

  // Report long task
  reportLongTask(entry) {
    console.warn('Long task detected:', entry.duration + 'ms');
    
    this.reportMetric('long_task', entry.duration);
  }

  // Report error
  reportError(errorInfo) {
    console.error('Performance error:', errorInfo);
    
    // Send to error reporting service
    if (window.errorReportingService) {
      window.errorReportingService.reportError(errorInfo);
    }
  }

  // Report high memory usage
  reportHighMemoryUsage(memoryInfo) {
    console.warn('High memory usage detected:', memoryInfo);
    
    this.reportMetric('memory_usage_high', memoryInfo.percentage);
  }

  // Report low frame rate
  reportLowFrameRate(fps) {
    console.warn('Low frame rate detected:', fps + 'fps');
    
    this.reportMetric('low_frame_rate', fps);
  }

  // Report high CPU usage
  reportHighCPUUsage(usage) {
    console.warn('High CPU usage detected:', usage + '%');
    
    this.reportMetric('cpu_usage_high', usage);
  }

  // Report slow resources
  reportSlowResources(resources) {
    console.warn('Slow resources detected:', resources);
    
    resources.forEach(resource => {
      this.reportMetric('slow_resource', resource.duration);
    });
  }

  // Report large resources
  reportLargeResources(resources) {
    console.warn('Large resources detected:', resources);
    
    resources.forEach(resource => {
      this.reportMetric('large_resource', resource.size);
    });
  }

  // Send metric to server
  async sendMetricToServer(name, value) {
    try {
      const endpoint = '/api/analytics/performance';
      
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metric: name,
          value,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (error) {
      // Fail silently for analytics
    }
  }

  // Get performance score
  getPerformanceScore() {
    const weights = {
      fcp: 0.15,
      lcp: 0.25,
      fid: 0.25,
      cls: 0.15,
      ttfb: 0.20
    };

    let score = 0;
    let totalWeight = 0;

    // Calculate weighted score
    Object.entries(this.metrics).forEach(([metric, value]) => {
      const weight = weights[metric];
      if (weight && value > 0) {
        let metricScore = this.getMetricScore(metric, value);
        score += metricScore * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(score / totalWeight) : 0;
  }

  // Get individual metric score
  getMetricScore(metric, value) {
    const thresholds = {
      fcp: { good: 1800, poor: 3000 },
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 50;

    if (value <= threshold.good) return 100;
    if (value >= threshold.poor) return 0;
    
    // Linear interpolation between good and poor
    const range = threshold.poor - threshold.good;
    const position = value - threshold.good;
    return Math.round(100 - (position / range) * 100);
  }

  // Get performance report
  getPerformanceReport() {
    return {
      score: this.getPerformanceScore(),
      metrics: { ...this.metrics },
      recommendations: this.getRecommendations(),
      timestamp: Date.now()
    };
  }

  // Get performance recommendations
  getRecommendations() {
    const recommendations = [];

    if (this.metrics.largestContentfulPaint > 4000) {
      recommendations.push('Optimize large content loading');
    }

    if (this.metrics.firstInputDelay > 300) {
      recommendations.push('Reduce JavaScript execution time');
    }

    if (this.metrics.cumulativeLayoutShift > 0.25) {
      recommendations.push('Minimize layout shifts');
    }

    return recommendations;
  }

  // Cleanup
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
const performanceService = new PerformanceService();

export default performanceService;