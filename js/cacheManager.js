"use strict";
(() => {
  if (!("serviceWorker" in navigator)) return;
  const version = window.FazendaSerenaConfig?.assetCacheVersion || "assets-r25";
  window.addEventListener("load", async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      // O mesmo escopo continua sendo usado; a nova revisão do SW limpa caches antigos.
      await navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(version)}`, { scope: "/", updateViaCache: "none" });
      for (const registration of registrations) registration.update?.().catch(()=>{});
    } catch (error) { console.warn("Cache offline indisponível:", error); }
  }, { once: true });
})();
