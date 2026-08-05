"use strict";

(() => {
  const COOKIE_NAME = "fazenda_serena_cookie_consent";
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;
  const DEFAULT_CONSENT = Object.freeze({
    necessary: true,
    analytics: false,
    advertising: false
  });

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  function normalizeConsent(value) {
    return {
      necessary: true,
      analytics: Boolean(value?.analytics),
      advertising: Boolean(value?.advertising)
    };
  }

  function readCookie(name) {
    const prefix = `${encodeURIComponent(name)}=`;
    const item = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));
    return item ? decodeURIComponent(item.slice(prefix.length)) : "";
  }

  function readStoredConsent() {
    try {
      const raw = readCookie(COOKIE_NAME);
      return raw ? normalizeConsent(JSON.parse(raw)) : null;
    } catch (error) {
      console.warn("Não foi possível ler as preferências de cookies.", error);
      return null;
    }
  }

  function writeStoredConsent(consent) {
    try {
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${encodeURIComponent(COOKIE_NAME)}=${encodeURIComponent(JSON.stringify(consent))}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
      return true;
    } catch (error) {
      console.warn("Não foi possível gravar as preferências de cookies neste contexto.", error);
      return false;
    }
  }

  let currentConsent = readStoredConsent() || { ...DEFAULT_CONSENT };

  function consentModePayload(consent) {
    return {
      ad_storage: consent.advertising ? "granted" : "denied",
      ad_user_data: consent.advertising ? "granted" : "denied",
      ad_personalization: consent.advertising ? "granted" : "denied",
      analytics_storage: consent.analytics ? "granted" : "denied",
      functionality_storage: "granted",
      personalization_storage: "denied",
      security_storage: "granted"
    };
  }

  window.gtag("consent", "default", {
    ...consentModePayload(currentConsent),
    wait_for_update: 500
  });

  function applyConsent(nextConsent, persist = true) {
    currentConsent = normalizeConsent(nextConsent);
    if (persist) writeStoredConsent(currentConsent);
    window.gtag("consent", "update", consentModePayload(currentConsent));
    window.dispatchEvent(new CustomEvent("fazenda:consentchange", {
      detail: { ...currentConsent }
    }));
    return { ...currentConsent };
  }

  function closeDialog(dialog) {
    if (dialog?.open) dialog.close();
  }

  function setFormValues(dialog) {
    const analytics = dialog?.querySelector("#analyticsCookiesSetting");
    const advertising = dialog?.querySelector("#advertisingCookiesSetting");
    if (analytics) analytics.checked = currentConsent.analytics;
    if (advertising) advertising.checked = currentConsent.advertising;
  }

  function initPrivacyControls() {
    const banner = document.querySelector("#cookieBanner");
    const dialog = document.querySelector("#cookiePreferencesDialog");
    const openButtons = document.querySelectorAll("[data-open-cookie-preferences]");
    const acceptButton = document.querySelector("#acceptAllCookies");
    const rejectButton = document.querySelector("#rejectOptionalCookies");
    const customizeButton = document.querySelector("#customizeCookies");
    const saveButton = document.querySelector("#saveCookiePreferences");
    const cancelButton = document.querySelector("#cancelCookiePreferences");

    const openPreferences = () => {
      if (!dialog) return;
      setFormValues(dialog);
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    };

    openButtons.forEach((button) => button.addEventListener("click", openPreferences));
    customizeButton?.addEventListener("click", openPreferences);

    acceptButton?.addEventListener("click", () => {
      applyConsent({ necessary: true, analytics: true, advertising: true });
      if (banner) banner.hidden = true;
    });

    rejectButton?.addEventListener("click", () => {
      applyConsent(DEFAULT_CONSENT);
      if (banner) banner.hidden = true;
    });

    saveButton?.addEventListener("click", () => {
      const analytics = Boolean(dialog?.querySelector("#analyticsCookiesSetting")?.checked);
      const advertising = Boolean(dialog?.querySelector("#advertisingCookiesSetting")?.checked);
      applyConsent({ necessary: true, analytics, advertising });
      if (banner) banner.hidden = true;
      closeDialog(dialog);
    });

    cancelButton?.addEventListener("click", () => closeDialog(dialog));

    dialog?.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });

    if (banner) banner.hidden = Boolean(readStoredConsent());
  }

  window.FAZENDA_PRIVACY = Object.freeze({
    getConsent: () => ({ ...currentConsent }),
    setConsent: (consent) => applyConsent(consent),
    hasStoredChoice: () => Boolean(readStoredConsent()),
    openPreferences: () => document.querySelector("[data-open-cookie-preferences]")?.click()
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPrivacyControls, { once: true });
  } else {
    initPrivacyControls();
  }
})();
