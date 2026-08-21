"use strict";

(() => {
  const state = { items: [], loaded: false, error: null };

  const kindMap = Object.freeze({
    icons: "icone",
    plants: "planta",
    avatars: "avatar"
  });

  const cleanText = (value, max = 120) => String(value ?? "").trim().slice(0, max);
  const cleanPath = value => {
    const path = cleanText(value, 240).replaceAll("\\", "/");
    if (!path || path.startsWith("/") || !path.startsWith("assets/") || path.includes("..") || path.includes("\0") || !/\.(?:webp|png|jpg|jpeg|gif|svg)$/i.test(path)) return "";
    return path;
  };

  function normalizeIndex(payload) {
    const output = [];
    Object.entries(kindMap).forEach(([group, kind]) => {
      const entries = Array.isArray(payload?.[group]) ? payload[group] : [];
      entries.forEach(entry => {
        const value = cleanPath(entry?.path);
        const label = cleanText(entry?.name, 100);
        if (!value || !label) return;
        output.push({ value, label, kind, source: "image-index" });
      });
    });
    return output.sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
  }

  async function loadIndex() {
    try {
      const response = await fetch("image-index.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.items = normalizeIndex(await response.json());
      state.loaded = true;
      window.dispatchEvent(new CustomEvent("admin-asset-registry-ready", { detail: { count: state.items.length } }));
      return state.items;
    } catch (error) {
      state.error = error;
      state.loaded = true;
      console.warn("Não foi possível carregar image-index.json:", error);
      window.dispatchEvent(new CustomEvent("admin-asset-registry-ready", { detail: { count: 0, error } }));
      return [];
    }
  }

  const registry = {
    ready: null,
    isLoaded() { return state.loaded; },
    getError() { return state.error; },
    all() { return state.items.map(item => ({ ...item })); },
    byKind(kind) { return state.items.filter(item => item.kind === kind).map(item => ({ ...item })); },
    options(kind) { return this.byKind(kind).map(item => ({ value: item.value, label: item.label })); }
  };

  registry.ready = loadIndex();
  window.LocalAssetLibrary = registry;
  window.AdminAssetRegistry = registry;
})();
