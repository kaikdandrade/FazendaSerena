"use strict";

const CACHE_NAME = "fazenda-serena-pwa-r36-ux-rework";
const APP_SHELL = [
  "/",
  "/index.html",
  "/play.html",
  "/noticias.html",
  "/tutorial.html",
  "/404.html",
  "/manifest.webmanifest",
  "/css/home.css",
  "/css/monetization.css",
  "/css/tutorial.css",
  "/js/pwaInstall.js",
  "/js/cacheManager.js",
  "/js/publicCloud.js",
  "/js/appConfig.js",
  "/js/siteVersion.js",
  "/js/tutorial.js",
  "/assets/logo.webp",
  "/assets/favicon.ico",
  "/assets/pwa/icon-192.png",
  "/assets/pwa/icon-512.png",
  "/assets/pwa/icon-maskable-512.png",
  "/assets/pwa/apple-touch-icon.png",
  "/assets/icons/moeda.webp",
  "/assets/icons/pocao-pesquisa.webp",
  "/assets/icons/prestigio.webp",
  "/assets/icons/xp.webp"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(APP_SHELL.map(url => cache.add(url))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("fazenda-serena-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  const fallback = url.pathname === "/" || url.pathname === "/index.html" ? "/index.html" : (url.pathname === "/play.html" ? "/play.html" : null);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (error) {
    return (await cache.match(request)) || (fallback ? await cache.match(fallback) : null) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request).then(response => {
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  }).catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  const staticDestination = ["style", "script", "image", "audio", "font", "manifest"].includes(request.destination);
  const staticPath = url.pathname.startsWith("/assets/") || url.pathname.startsWith("/css/") || url.pathname.startsWith("/js/") || url.pathname.endsWith(".webmanifest");
  if (staticDestination || staticPath) event.respondWith(staleWhileRevalidate(request));
});
