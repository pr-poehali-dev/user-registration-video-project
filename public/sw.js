// Service Worker для IMPERIA PROMO PWA
const CACHE_NAME = 'imperia-promo-v1.0.0';
const API_CACHE_NAME = 'imperia-promo-api-v1.0.0';

// Файлы для кэширования
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/comprehensive-video-test.html',
  '/create-app-icons.html'
];

// API URLs для кэширования ответов
const API_URLS = [
  'https://functions.poehali.dev/080ec769-925f-4132-8cd3-549c89bdc4c0',
  'https://functions.poehali.dev/a119ce14-9a5b-40de-b18f-3ef1f6dc7484',
  'https://functions.poehali.dev/75e3022c-965a-4cd9-b5c1-bd179806e509',
  'https://functions.poehali.dev/bf64fc6c-c075-4df6-beb9-f5b527586fa1'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Кэшируем статические файлы
      caches.open(CACHE_NAME).then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Создаем кэш для API
      caches.open(API_CACHE_NAME)
    ]).then(() => {
      console.log('✅ Service Worker: Installation complete');
      // Принудительно активируем новый SW
      return self.skipWaiting();
    })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Очищаем старые кэши
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Берем контроль над всеми клиентами
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker: Activation complete');
    })
  );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Пропускаем non-GET запросы для API (POST, PUT, DELETE)
  if (request.method !== 'GET') {
    return;
  }
  
  // Пропускаем хромные внутренние запросы
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Стратегия для API запросов: Network First (сеть первая)
        if (API_URLS.some(apiUrl => request.url.includes(apiUrl.split('/').pop()))) {
          return await handleApiRequest(request);
        }
        
        // Стратегия для статических файлов: Cache First (кэш первый)
        if (isStaticAsset(request.url)) {
          return await handleStaticRequest(request);
        }
        
        // Стратегия для навигации: Network First с fallback
        if (request.mode === 'navigate') {
          return await handleNavigationRequest(request);
        }
        
        // Для всех остальных запросов: Network First
        return await handleNetworkFirst(request);
        
      } catch (error) {
        console.error('🚨 Service Worker fetch error:', error);
        return new Response('Offline', { status: 503 });
      }
    })()
  );
});

// Обработка API запросов (Network First)
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Пытаемся получить свежие данные из сети
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Кэшируем только успешные GET ответы
      if (request.method === 'GET') {
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📱 API offline, trying cache:', request.url);
    
    // Если сеть недоступна, ищем в кэше
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('✅ Serving API from cache');
      return cachedResponse;
    }
    
    // Если нет кэша, возвращаем офлайн ответ
    return new Response(JSON.stringify({
      error: 'Offline mode',
      message: 'Этот функционал недоступен без интернета'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Обработка статических файлов (Cache First)
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Возвращаем из кэша и обновляем в фоне
    updateCacheInBackground(request, cache);
    return cachedResponse;
  }
  
  // Если нет в кэше, загружаем из сети
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('File not available offline', { status: 503 });
  }
}

// Обновление кэша в фоновом режиме
async function updateCacheInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Игнорируем ошибки фонового обновления
  }
}

// Обработка навигационных запросов
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Офлайн страница навигации
    const cache = await caches.open(CACHE_NAME);
    const offlinePage = await cache.match('/');
    return offlinePage || new Response('App offline', { status: 503 });
  }
}

// Network First стратегия
async function handleNetworkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Кэшируем успешные ответы
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Ищем в кэше если сеть недоступна
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Resource not available offline', { status: 503 });
  }
}

// Проверка, является ли ресурс статическим
function isStaticAsset(url) {
  return (
    url.includes('.js') ||
    url.includes('.css') ||
    url.includes('.png') ||
    url.includes('.jpg') ||
    url.includes('.jpeg') ||
    url.includes('.svg') ||
    url.includes('.ico') ||
    url.includes('/img/') ||
    url.includes('/assets/')
  );
}

// Обработка push уведомлений
self.addEventListener('push', (event) => {
  console.log('📢 Push notification received');
  
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'У вас новое сообщение',
      icon: '/img/icon-192x192.png',
      badge: '/img/icon-72x72.png',
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Открыть приложение',
          icon: '/img/icon-96x96.png'
        },
        {
          action: 'close',
          title: 'Закрыть',
          icon: '/img/icon-96x96.png'
        }
      ],
      requireInteraction: true,
      tag: 'imperia-notification'
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'IMPERIA PROMO', options)
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Периодическая синхронизация в фоне
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Здесь можно добавить логику синхронизации данных
      console.log('Running background sync')
    );
  }
});

// Обработка ошибок
self.addEventListener('error', (event) => {
  console.error('🚨 Service Worker error:', event.error);
});

// Обработка необработанных отклонений Promise
self.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Service Worker unhandled rejection:', event.reason);
});

console.log('🎉 Service Worker loaded successfully!');