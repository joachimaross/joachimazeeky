class PWAService {
  constructor() {
    this.isInstalled = false;
    this.deferredPrompt = null;
    this.registration = null;
    this.updateAvailable = false;
    this.init();
  }

  init() {
    // Register service worker
    this.registerServiceWorker();
    
    // Setup PWA install prompt
    this.setupInstallPrompt();
    
    // Setup app update handling
    this.setupUpdateHandling();
    
    // Setup background sync
    this.setupBackgroundSync();
    
    // Setup push notifications
    this.setupPushNotifications();
    
    console.log('🚀 PWA Service initialized');
  }

  // Register service worker
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        
        console.log('✅ Service Worker registered:', this.registration);
        
        // Listen for service worker updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true;
              this.notifyUpdateAvailable();
            }
          });
        });
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
        
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
  }

  // Setup install prompt
  setupInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (event) => {
      // Prevent the mini-infobar from appearing
      event.preventDefault();
      
      // Store the event for later use
      this.deferredPrompt = event;
      
      console.log('📱 PWA install prompt available');
      
      // Notify app that install is available
      this.dispatchEvent('pwa-install-available');
    });

    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA installed successfully');
      this.isInstalled = true;
      this.deferredPrompt = null;
      
      // Track installation
      this.trackEvent('pwa_installed');
      
      // Notify app of installation
      this.dispatchEvent('pwa-installed');
    });
  }

  // Setup update handling
  setupUpdateHandling() {
    // Check for updates periodically
    setInterval(() => {
      if (this.registration) {
        this.registration.update();
      }
    }, 60000); // Check every minute
  }

  // Setup background sync
  setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      console.log('🔄 Background sync available');
    } else {
      console.warn('⚠️ Background sync not supported');
    }
  }

  // Setup push notifications
  async setupPushNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      console.log('📬 Push notifications available');
    } else {
      console.warn('⚠️ Push notifications not supported');
    }
  }

  // Handle service worker messages
  handleServiceWorkerMessage(event) {
    const { type, payload } = event.data;
    
    switch (type) {
      case 'SYNC_COMPLETE':
        this.dispatchEvent('sync-complete', payload);
        break;
        
      case 'CACHE_UPDATED':
        this.dispatchEvent('cache-updated', payload);
        break;
        
      case 'OFFLINE_MODE':
        this.dispatchEvent('offline-mode', payload);
        break;
        
      default:
        console.log('Unknown service worker message:', type);
    }
  }

  // Show install prompt
  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      throw new Error('Install prompt not available');
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt();
      
      // Wait for user choice
      const choiceResult = await this.deferredPrompt.userChoice;
      
      console.log('User install choice:', choiceResult.outcome);
      
      // Track user choice
      this.trackEvent('pwa_install_prompt', {
        outcome: choiceResult.outcome
      });
      
      // Clear the prompt
      this.deferredPrompt = null;
      
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('❌ Install prompt failed:', error);
      return false;
    }
  }

  // Check if app can be installed
  canInstall() {
    return !!this.deferredPrompt;
  }

  // Check if app is installed
  isAppInstalled() {
    // Check various indicators of installation
    return (
      this.isInstalled ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.startsWith('android-app://')
    );
  }

  // Request notification permission
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    let permission = Notification.permission;
    
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    console.log('Notification permission:', permission);
    
    // Track permission result
    this.trackEvent('notification_permission', {
      permission
    });
    
    return permission === 'granted';
  }

  // Subscribe to push notifications
  async subscribeToPushNotifications() {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    try {
      // Check if already subscribed
      let subscription = await this.registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe to push notifications
        const vapidKey = process.env.REACT_APP_VAPID_KEY;
        
        if (!vapidKey) {
          throw new Error('VAPID key not configured');
        }

        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
        });
      }

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      console.log('✅ Push notifications subscribed');
      return subscription;
    } catch (error) {
      console.error('❌ Push notification subscription failed:', error);
      throw error;
    }
  }

  // Send subscription to server
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      console.log('✅ Subscription saved to server');
    } catch (error) {
      console.error('❌ Failed to save subscription:', error);
      throw error;
    }
  }

  // Convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Update app
  async updateApp() {
    if (!this.updateAvailable || !this.registration) {
      throw new Error('No update available');
    }

    try {
      // Skip waiting and activate new service worker
      if (this.registration.waiting) {
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Reload the page to get the new version
      window.location.reload();
    } catch (error) {
      console.error('❌ App update failed:', error);
      throw error;
    }
  }

  // Notify update available
  notifyUpdateAvailable() {
    this.dispatchEvent('update-available');
    
    // Show update notification
    if (Notification.permission === 'granted') {
      new Notification('Zeeky AI Update Available', {
        body: 'A new version of Zeeky AI is ready to install.',
        icon: '/logo192.png',
        tag: 'app-update',
        actions: [
          { action: 'update', title: 'Update Now' },
          { action: 'dismiss', title: 'Later' }
        ]
      });
    }
  }

  // Check network status
  isOnline() {
    return navigator.onLine;
  }

  // Schedule background sync
  async scheduleBackgroundSync(tag) {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await this.registration.sync.register(tag);
        console.log('🔄 Background sync scheduled:', tag);
      } catch (error) {
        console.error('❌ Background sync failed:', error);
      }
    }
  }

  // Cache resources
  async cacheResources(urls) {
    if (this.registration) {
      this.registration.active.postMessage({
        type: 'CACHE_URLS',
        payload: { urls }
      });
    }
  }

  // Clear cache
  async clearCache() {
    if (this.registration) {
      this.registration.active.postMessage({
        type: 'CLEAR_CACHE'
      });
    }
  }

  // Track events
  trackEvent(eventName, properties = {}) {
    // Send to analytics service
    if (window.gtag) {
      window.gtag('event', eventName, properties);
    }
    
    // Send to custom analytics
    console.log('📊 PWA Event:', eventName, properties);
  }

  // Dispatch custom events
  dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }

  // Get installation instructions for different platforms
  getInstallInstructions() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('android')) {
      return {
        platform: 'Android',
        steps: [
          'Tap the menu button (⋮) in your browser',
          'Select "Add to Home screen"',
          'Tap "Add" to install Zeeky AI'
        ]
      };
    }
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return {
        platform: 'iOS',
        steps: [
          'Tap the Share button (⬆️) in Safari',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" to install Zeeky AI'
        ]
      };
    }
    
    return {
      platform: 'Desktop',
      steps: [
        'Look for the install icon in your browser\'s address bar',
        'Click "Install Zeeky AI"',
        'Confirm installation'
      ]
    };
  }

  // Get storage usage
  async getStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage,
          available: estimate.quota,
          percentage: Math.round((estimate.usage / estimate.quota) * 100)
        };
      } catch (error) {
        console.error('❌ Storage estimate failed:', error);
      }
    }
    return null;
  }
}

// Create singleton instance
const pwaService = new PWAService();

export default pwaService;