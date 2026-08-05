"use strict";

(() => {
  const PUBLISHER_PATTERN = /^ca-pub-\d{16}$/;
  const SLOT_PATTERN = /^\d+$/;
  let scriptPromise = null;
  const renderedPlacements = new WeakSet();

  function getConfig() {
    return window.ADSENSE_CONFIG || {};
  }

  function hasAdvertisingConsent() {
    return Boolean(window.FAZENDA_PRIVACY?.getConsent?.().advertising);
  }

  function isConfigured() {
    return PUBLISHER_PATTERN.test(String(getConfig().publisherId || ""));
  }

  function loadAdSenseScript() {
    if (!isConfigured() || !hasAdvertisingConsent()) return Promise.resolve(false);
    if (scriptPromise) return scriptPromise;

    const existing = document.querySelector("script[data-fazenda-adsense]");
    if (existing) return Promise.resolve(true);

    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.fazendaAdsense = "true";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(getConfig().publisherId)}`;
      script.addEventListener("load", () => resolve(true), { once: true });
      script.addEventListener("error", () => reject(new Error("Falha ao carregar o Google AdSense.")), { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      scriptPromise = null;
      console.warn(error.message);
      return false;
    });

    return scriptPromise;
  }

  function renderPlacement(element) {
    if (!element || renderedPlacements.has(element)) return;
    const placementName = element.dataset.adsensePlacement;
    const slot = String(getConfig().slots?.[placementName] || "");
    if (!SLOT_PATTERN.test(slot)) return;

    const ad = document.createElement("ins");
    ad.className = "adsbygoogle";
    ad.style.display = "block";
    ad.dataset.adClient = getConfig().publisherId;
    ad.dataset.adSlot = slot;
    ad.dataset.adFormat = "auto";
    ad.dataset.fullWidthResponsive = "true";

    element.replaceChildren(ad);
    element.hidden = false;
    element.classList.add("is-ready");
    renderedPlacements.add(element);

    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
  }

  async function activateAds() {
    if (!isConfigured() || !hasAdvertisingConsent()) return;
    const loaded = await loadAdSenseScript();
    if (!loaded) return;
    document.querySelectorAll("[data-adsense-placement]").forEach(renderPlacement);
  }

  function ensureVerificationMeta() {
    if (!isConfigured()) return;
    let meta = document.querySelector('meta[name="google-adsense-account"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "google-adsense-account";
      document.head.appendChild(meta);
    }
    meta.content = getConfig().publisherId;
  }

  function init() {
    if (!isConfigured()) {
      console.info("AdSense preparado, mas ainda sem publisherId em js/adsense-config.js.");
      return;
    }
    ensureVerificationMeta();
    activateAds();
  }

  window.addEventListener("fazenda:consentchange", (event) => {
    if (event.detail?.advertising) activateAds();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
