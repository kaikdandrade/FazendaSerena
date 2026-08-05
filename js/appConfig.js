"use strict";

(() => {
  const config = Object.freeze({
    appVersion: "1.0.0",
    releaseChannel: "release",
    audioDefaults: Object.freeze({
      musicVolume: 10
    })
  });

  Object.defineProperty(window, "FazendaSerenaConfig", {
    value: config,
    writable: false,
    configurable: false,
    enumerable: true
  });

  const applyVersion = () => {
    document.documentElement.dataset.releaseChannel = config.releaseChannel;
    document.querySelectorAll("[data-app-version]").forEach(element => {
      element.textContent = config.appVersion;
    });

    let versionMeta = document.querySelector('meta[name="application-version"]');
    if (!versionMeta) {
      versionMeta = document.createElement("meta");
      versionMeta.name = "application-version";
      document.head.append(versionMeta);
    }
    versionMeta.content = config.appVersion;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyVersion, { once: true });
  } else {
    applyVersion();
  }
})();
