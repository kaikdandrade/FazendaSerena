"use strict";

const CACHE_NAME = "fazenda-serena-pwa-r66-avatar-loading-search";
const APP_SHELL = [
  "/",
  "/index.html",
  "/play.html",
  "/css/stylish.css",
  "/css/play.css?v=66",
  "/css/tutorial.css",
  "/css/admin.css?v=66",
  "/css/index.css?v=64",
  "/css/404.css",
  "/css/privacy.css",
  "/css/terms.css",
  "/css/noticias.css",
  "/css/monetization.css",
  "/js/themeBootstrap.js",
  "/404.html",
  "/assets/backgrounds/404-fazenda.webp",
  "/noticias.html",
  "/tutorial.html",
  "/js/appConfig.js",
  "/js/data.js",
  "/js/avatars.js",
  "/js/gameAdmin.js",
  "/js/engine/GameEngineCore.js",
  "/js/engine/GameEngineProduction.js",
  "/js/engine/GameEngineProgression.js",
  "/js/engine/GameEngineCommerce.js",
  "/js/engine/GameEngineContracts.js",
  "/js/engine/GameEngineMissions.js",
  "/js/engine/GameEnginePrestigeSettings.js",
  "/js/engine/GameEngineGuard.js",
  "/js/app/appState.js",
  "/js/app/appUtils.js",
  "/js/app/appAccountSocial.js",
  "/js/app/appNavigation.js",
  "/js/app/appCrops.js",
  "/js/app/appEvolutions.js",
  "/js/app/appCommerceMissions.js",
  "/js/app/appStatistics.js",
  "/js/app/appLiveUpdates.js",
  "/js/app/appLiveSocial.js",
  "/js/app/appRendererActions.js",
  "/js/app/appEventsLoop.js",
  "/js/app/appFeedback.js",
  "/js/app/bootstrap.js",
  "/js/tutorial.js",
  "/manifest.webmanifest",
  "/js/pwaInstall.js",
  "/js/cacheManager.js",
  "/js/modalGuard.js",
  "/assets/logo.webp",
  "/assets/favicon.ico",
  "/assets/pwa/icon-192.png",
  "/assets/pwa/icon-512.png",
  "/assets/pwa/icon-maskable-512.png",
  "/assets/pwa/apple-touch-icon.png",
  "/assets/icons/moeda.webp",
  "/assets/icons/pocao-pesquisa.webp",
  "/assets/icons/prestigio.webp",
  "/assets/icons/xp.webp",
  "/assets/icons/pesquisa-catalogo.webp",
  "/assets/icons/filtro-catalogo.webp",
  "/assets/icons/pausa-producao.webp"
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
