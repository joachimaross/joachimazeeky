// Service Worker for Zeeky AI PWA
const CACHE_NAME = 'zeeky-ai-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html',
  // Add more critical assets
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/ai\/personalities/,
  /\/api\/user\/profile/,
  /\/api\/settings/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If successful, clone and cache the response
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // If offline, serve cached page or offline page
          return caches.match(request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(request, responseClone));
              }
              return response;
            });
        })
    );
    return;
  }

  // Handle API requests with network-first strategy
  if (isAPIRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200 && shouldCacheAPI(url)) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline response for critical APIs
              return new Response(
                JSON.stringify({
                  error: 'OFFLINE',
                  message: 'This feature requires an internet connection',
                  cached: false
                }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }

  // For other requests, use network-first strategy
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-chat-messages') {
    event.waitUntil(syncChatMessages());
  }
  
  if (event.tag === 'sync-user-data') {
    event.waitUntil(syncUserData());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received');
  
  if (!event.data) {
    return;
  }

  const payload = event.data.json();
  const options = {
    title: payload.title || 'Zeeky AI',
    body: payload.body || 'You have a new message',
    icon: '/logo192.png',
    badge: '/badge-72x72.png',
    image: payload.image,
    data: payload.data || {},
    actions: [
      {
        action: 'open',
        title: 'Open Zeeky AI',
        icon: '/icon-open.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-dismiss.png'
      }
    ],
    tag: payload.tag || 'default',
    renotify: true,
    requireInteraction: payload.requireInteraction || false,
    silent: payload.silent || false,
    vibrate: payload.vibrate || [200, 100, 200],
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Handle notification clicks
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        const data = event.notification.data || {};
        const url = data.url || '/';

        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Utility functions
function isStaticAsset(url) {
  return url.pathname.startsWith('/static/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.jpeg') ||
         url.pathname.endsWith('.gif') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.woff') ||
         url.pathname.endsWith('.woff2');
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/');
}

function shouldCacheAPI(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Sync functions for background sync
async function syncChatMessages() {
  try {
    console.log('🔄 Syncing chat messages...');
    
    // Get pending messages from IndexedDB
    const pendingMessages = await getPendingMessages();
    
    for (const message of pendingMessages) {
      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${message.token}`
          },
          body: JSON.stringify(message.data)
        });
        
        if (response.ok) {
          await removePendingMessage(message.id);
          console.log('✅ Message synced:', message.id);
        }
      } catch (error) {
        console.error('❌ Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('❌ Chat sync failed:', error);
  }
}

async function syncUserData() {
  try {
    console.log('🔄 Syncing user data...');
    
    // Get pending user data updates from IndexedDB
    const pendingUpdates = await getPendingUserUpdates();
    
    for (const update of pendingUpdates) {
      try {
        const response = await fetch('/api/user/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${update.token}`
          },
          body: JSON.stringify(update.data)
        });
        
        if (response.ok) {
          await removePendingUserUpdate(update.id);
          console.log('✅ User data synced:', update.id);
        }
      } catch (error) {
        console.error('❌ Failed to sync user data:', error);
      }
    }
  } catch (error) {
    console.error('❌ User data sync failed:', error);
  }
}

// IndexedDB operations (simplified - would need proper implementation)
async function getPendingMessages() {
  // Implementation would use IndexedDB to get pending messages
  return [];
}

async function removePendingMessage(id) {
  // Implementation would remove message from IndexedDB
  console.log('Removing pending message:', id);
}

async function getPendingUserUpdates() {
  // Implementation would use IndexedDB to get pending updates
  return [];
}

async function removePendingUserUpdate(id) {
  // Implementation would remove update from IndexedDB
  console.log('Removing pending user update:', id);
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(
        caches.open(CACHE_NAME)
          .then((cache) => cache.addAll(payload.urls))
      );
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.delete(CACHE_NAME)
          .then(() => caches.open(CACHE_NAME))
      );
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

console.log('🚀 Zeeky AI Service Worker loaded');