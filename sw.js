"use strict";
const CACHE_NAME = "fazenda-serena-assets-r25";
const CORE_ASSETS = [
  "/assets/logo.webp", "/assets/favicon.ico",
  "/assets/icons/moeda.webp", "/assets/icons/pocao-pesquisa.webp",
  "/assets/icons/prestigio.webp", "/assets/icons/xp.webp"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("fazenda-serena-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request=event.request;
  if(request.method!=="GET") return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;
  const isAsset=url.pathname.startsWith("/assets/") || ["image","audio","font"].includes(request.destination);
  if(!isAsset) return;
  event.respondWith(caches.match(request).then(cached=>{
    if(cached) return cached;
    return fetch(request).then(response=>{
      if(response && response.ok){ const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)); }
      return response;
    });
  }));
});
