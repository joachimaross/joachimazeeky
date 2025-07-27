import { auth } from '../firebase-config';
import PWAService from './PWAService';

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.subscription = null;
    this.isInitialized = false;
    this.notificationQueue = [];
    this.settings = {
      enabled: true,
      sound: true,
      vibration: true,
      desktop: true,
      mobile: true,
      adminAlerts: true,
      chatMessages: true,
      systemUpdates: true,
      securityAlerts: true
    };
    
    this.init();
  }

  async init() {
    try {
      // Load settings from localStorage
      this.loadSettings();
      
      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.warn('⚠️ Browser notifications not supported');
        return;
      }

      // Get current permission
      this.permission = Notification.permission;
      
      // Initialize service worker registration for push notifications
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        await this.initializePushNotifications();
      }

      this.isInitialized = true;
      console.log('✅ Notification Service initialized');
      
      // Process queued notifications
      this.processNotificationQueue();
      
    } catch (error) {
      console.error('❌ Notification Service initialization failed:', error);
    }
  }

  // Load notification settings
  loadSettings() {
    try {
      const saved = localStorage.getItem('zeeky_notification_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  // Save notification settings
  saveSettings() {
    try {
      localStorage.setItem('zeeky_notification_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      throw new Error('Browser notifications not supported');
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      console.log('📱 Notification permission:', permission);
      
      // Track permission result
      this.trackEvent('notification_permission_requested', {
        permission,
        timestamp: new Date().toISOString()
      });

      if (permission === 'granted') {
        await this.initializePushNotifications();
      }

      return permission === 'granted';
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      throw error;
    }
  }

  // Initialize push notifications
  async initializePushNotifications() {
    try {
      if (!PWAService.registration) {
        console.warn('⚠️ Service worker not registered, push notifications unavailable');
        return;
      }

      // Subscribe to push notifications
      await this.subscribeToPush();
      
    } catch (error) {
      console.error('❌ Push notification initialization failed:', error);
    }
  }

  // Subscribe to push notifications
  async subscribeToPush() {
    try {
      const vapidKey = process.env.REACT_APP_VAPID_KEY;
      if (!vapidKey) {
        console.warn('⚠️ VAPID key not configured');
        return;
      }

      // Check if already subscribed
      this.subscription = await PWAService.registration.pushManager.getSubscription();
      
      if (!this.subscription) {
        // Create new subscription
        this.subscription = await PWAService.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
        });
      }

      // Send subscription to server
      await this.sendSubscriptionToServer();
      
      console.log('✅ Push notifications subscribed');
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      throw error;
    }
  }

  // Send subscription to server
  async sendSubscriptionToServer() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.warn('⚠️ User not authenticated, subscription not saved');
        return;
      }

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          subscription: this.subscription,
          settings: this.settings,
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          userId: user.uid
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      console.log('✅ Push subscription saved to server');
    } catch (error) {
      console.error('❌ Failed to save subscription:', error);
    }
  }

  // Show local notification
  async showNotification(title, options = {}) {
    if (!this.settings.enabled) {
      console.log('📴 Notifications disabled by user');
      return;
    }

    if (this.permission !== 'granted') {
      console.warn('⚠️ Notification permission not granted');
      this.notificationQueue.push({ title, options });
      return;
    }

    try {
      const defaultOptions = {
        icon: '/logo192.png',
        badge: '/badge-72x72.png',
        vibrate: this.settings.vibration ? [200, 100, 200] : [],
        silent: !this.settings.sound,
        timestamp: Date.now(),
        requireInteraction: false,
        ...options
      };

      // Create notification
      if (PWAService.registration && PWAService.registration.showNotification) {
        // Use service worker for better persistence
        await PWAService.registration.showNotification(title, defaultOptions);
      } else {
        // Fallback to browser notification
        new Notification(title, defaultOptions);
      }

      // Track notification
      this.trackEvent('notification_shown', {
        title,
        type: options.type || 'default',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Failed to show notification:', error);
    }
  }

  // Send admin notification
  async sendAdminNotification(title, body, data = {}) {
    if (!this.settings.adminAlerts) {
      return;
    }

    await this.showNotification(title, {
      body,
      data: { type: 'admin', ...data },
      tag: 'admin-alert',
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }

  // Send chat message notification
  async sendChatNotification(sender, message, conversationId) {
    if (!this.settings.chatMessages) {
      return;
    }

    await this.showNotification(`New message from ${sender}`, {
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      data: { 
        type: 'chat', 
        conversationId,
        senderId: sender 
      },
      tag: `chat-${conversationId}`,
      actions: [
        { action: 'reply', title: 'Reply' },
        { action: 'view', title: 'View Conversation' }
      ]
    });
  }

  // Send system update notification
  async sendSystemNotification(title, body, data = {}) {
    if (!this.settings.systemUpdates) {
      return;
    }

    await this.showNotification(title, {
      body,
      data: { type: 'system', ...data },
      tag: 'system-update',
      actions: [
        { action: 'update', title: 'Update Now' },
        { action: 'later', title: 'Later' }
      ]
    });
  }

  // Send security alert
  async sendSecurityAlert(title, body, data = {}) {
    if (!this.settings.securityAlerts) {
      return;
    }

    await this.showNotification(title, {
      body,
      data: { type: 'security', ...data },
      tag: 'security-alert',
      requireInteraction: true,
      urgency: 'high',
      actions: [
        { action: 'secure', title: 'Secure Account' },
        { action: 'review', title: 'Review Activity' }
      ]
    });
  }

  // Schedule notification
  async scheduleNotification(title, options = {}, delay = 0) {
    if (delay > 0) {
      setTimeout(() => {
        this.showNotification(title, options);
      }, delay);
    } else {
      await this.showNotification(title, options);
    }
  }

  // Process queued notifications
  async processNotificationQueue() {
    if (this.permission !== 'granted' || this.notificationQueue.length === 0) {
      return;
    }

    const queue = [...this.notificationQueue];
    this.notificationQueue = [];

    for (const notification of queue) {
      await this.showNotification(notification.title, notification.options);
    }
  }

  // Update notification settings
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    
    // Update server settings
    this.updateServerSettings();
  }

  // Update server settings
  async updateServerSettings() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(this.settings)
      });

      console.log('✅ Notification settings updated on server');
    } catch (error) {
      console.error('❌ Failed to update server settings:', error);
    }
  }

  // Get notification history
  async getNotificationHistory(limit = 50) {
    try {
      const user = auth.currentUser;
      if (!user) return [];

      const response = await fetch(`/api/notifications/history?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification history');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get notification history:', error);
      return [];
    }
  }

  // Clear all notifications
  async clearAllNotifications() {
    try {
      if (PWAService.registration) {
        const notifications = await PWAService.registration.getNotifications();
        notifications.forEach(notification => notification.close());
      }
      
      console.log('✅ All notifications cleared');
    } catch (error) {
      console.error('❌ Failed to clear notifications:', error);
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        this.subscription = null;
        
        // Notify server
        const user = auth.currentUser;
        if (user) {
          await fetch('/api/notifications/unsubscribe', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${await user.getIdToken()}`
            }
          });
        }
        
        console.log('✅ Unsubscribed from push notifications');
      }
    } catch (error) {
      console.error('❌ Failed to unsubscribe:', error);
    }
  }

  // Check if notifications are supported
  isSupported() {
    return 'Notification' in window;
  }

  // Check if push notifications are supported
  isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Get permission status
  getPermission() {
    return this.permission;
  }

  // Get current settings
  getSettings() {
    return { ...this.settings };
  }

  // Test notification
  async testNotification() {
    await this.showNotification('Test Notification', {
      body: 'This is a test notification from Zeeky AI',
      data: { type: 'test' },
      tag: 'test-notification'
    });
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

  // Track events
  trackEvent(eventName, properties = {}) {
    // Send to analytics service
    if (window.gtag) {
      window.gtag('event', eventName, properties);
    }
    
    console.log('📊 Notification Event:', eventName, properties);
  }

  // Handle notification click (called from service worker)
  handleNotificationClick(event) {
    const { notification, action } = event;
    const data = notification.data || {};
    
    // Close notification
    notification.close();
    
    // Handle based on action and type
    switch (data.type) {
      case 'chat':
        if (action === 'reply') {
          // Open quick reply
          this.openQuickReply(data.conversationId);
        } else {
          // Open conversation
          this.openConversation(data.conversationId);
        }
        break;
        
      case 'admin':
        // Open admin panel
        this.openAdminPanel(data.section);
        break;
        
      case 'system':
        if (action === 'update') {
          // Trigger app update
          PWAService.updateApp();
        }
        break;
        
      case 'security':
        // Open security center
        this.openSecurityCenter();
        break;
        
      default:
        // Open main app
        this.openApp();
    }
  }

  // Helper methods for navigation
  openApp() {
    window.focus();
    window.location.href = '/';
  }

  openConversation(conversationId) {
    window.focus();
    window.location.href = `/chat/${conversationId}`;
  }

  openQuickReply(conversationId) {
    // Open quick reply modal
    window.dispatchEvent(new CustomEvent('open-quick-reply', {
      detail: { conversationId }
    }));
  }

  openAdminPanel(section = '') {
    window.focus();
    window.location.href = `/admin${section ? `/${section}` : ''}`;
  }

  openSecurityCenter() {
    window.focus();
    window.location.href = '/security';
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;