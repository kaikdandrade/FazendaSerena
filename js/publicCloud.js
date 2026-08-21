"use strict";

(() => {
  const PROJECT_ID = "fazenda-serena";
  const DOCUMENT_PATH = "gameConfig/public";
  const CACHE_KEY = "fazenda-serena-public-config-v1";
  const CACHE_TTL = 60 * 1000;
  let memory = null;
  let inflight = null;

  function decode(value) {
    if (!value || typeof value !== "object") return null;
    if ("stringValue" in value) return value.stringValue;
    if ("integerValue" in value) return Number(value.integerValue);
    if ("doubleValue" in value) return Number(value.doubleValue);
    if ("booleanValue" in value) return Boolean(value.booleanValue);
    if ("timestampValue" in value) return Date.parse(value.timestampValue);
    if ("nullValue" in value) return null;
    if (value.arrayValue) return (value.arrayValue.values || []).map(decode);
    if (value.mapValue) return decodeFields(value.mapValue.fields || {});
    return null;
  }

  function decodeFields(fields) {
    return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decode(value)]));
  }

  function readSessionCache() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (cached?.at && Date.now() - cached.at < CACHE_TTL && cached.config && typeof cached.config === "object") return cached.config;
    } catch {}
    return null;
  }

  function writeSessionCache(config) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), config })); } catch {}
  }

  async function fetchConfig() {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT_ID)}/databases/(default)/documents/${DOCUMENT_PATH}`;
    const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error(`Configuração pública indisponível (${response.status}).`);
    const document = await response.json();
    const root = decodeFields(document.fields || {});
    return root?.config && typeof root.config === "object" ? root.config : null;
  }

  async function loadConfig({ force = false } = {}) {
    if (!force && memory) return memory;
    if (!force) {
      const cached = readSessionCache();
      if (cached) { memory = cached; return cached; }
    }
    if (inflight) return inflight;
    inflight = fetchConfig()
      .then(config => {
        if (config) { memory = config; writeSessionCache(config); }
        return config;
      })
      .finally(() => { inflight = null; });
    return inflight;
  }

  function clearCache() {
    memory = null;
    try { sessionStorage.removeItem(CACHE_KEY); } catch {}
  }

  window.FazendaSerenaPublicCloud = Object.freeze({ loadConfig, clearCache });
})();
