"use strict";

(() => {
  const STATIC_FALLBACK = "1.0.0";

  function seedFallback() {
    document.querySelectorAll("[data-app-version]").forEach((element) => {
      if (!String(element.textContent || "").trim()) element.textContent = STATIC_FALLBACK;
    });
  }

  async function syncFromPublicConfig() {
    seedFallback();
    try {
      const cloud = window.FazendaSerenaPublicCloud;
      const configApi = window.FazendaSerenaConfig;
      if (!cloud?.loadConfig || !configApi) return;
      const publicConfig = await cloud.loadConfig();
      if (!publicConfig) return;
      const version = configApi.versionFromConfig?.(publicConfig) || publicConfig.gameVersion;
      if (version) configApi.applyCloudVersion?.(version);
    } catch {
      // Mantém o fallback estático quando a configuração remota não estiver disponível.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncFromPublicConfig, { once: true });
  } else {
    syncFromPublicConfig();
  }
})();
