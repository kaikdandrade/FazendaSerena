"use strict";

(() => {
  // Edite somente este bloco para alterar os padrões de uma nova fazenda.
  // Preferências já salvas pelos jogadores continuam sendo respeitadas.
  const experienceDefaults = Object.freeze({
    ambient: true,
    uiScale: 100,
    numberFormat: "brazilian"
  });

  const audioDefaults = Object.freeze({
    masterVolume: 100,
    musicVolume: 10,
    effectVolume: 55,
    musicTrack: "betweenLightAndShadows"
  });

  const config = Object.freeze({
    appVersion: "1.0.0",
    releaseChannel: "release",
    experienceDefaults,
    audioDefaults
  });

  Object.defineProperty(window, "FazendaSerenaConfig", {
    value: config,
    writable: false,
    configurable: false,
    enumerable: true
  });

  const setRangeDefault = (inputId, textId, value) => {
    const input = document.getElementById(inputId);
    const text = document.getElementById(textId);
    if (input) input.value = String(value);
    if (text) text.textContent = `${value}%`;
  };

  const applyConfig = () => {
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

    const ambientSetting = document.getElementById("ambientSetting");
    const numberFormatSetting = document.getElementById("numberFormatSetting");
    const musicTrackSetting = document.getElementById("musicTrackSetting");

    if (ambientSetting) ambientSetting.checked = experienceDefaults.ambient;
    if (numberFormatSetting) numberFormatSetting.value = experienceDefaults.numberFormat;
    if (musicTrackSetting) musicTrackSetting.value = audioDefaults.musicTrack;

    setRangeDefault("uiScaleSetting", "uiScaleText", experienceDefaults.uiScale);
    setRangeDefault("masterVolumeSetting", "masterVolumeText", audioDefaults.masterVolume);
    setRangeDefault("musicVolumeSetting", "musicVolumeText", audioDefaults.musicVolume);
    setRangeDefault("effectVolumeSetting", "effectVolumeText", audioDefaults.effectVolume);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyConfig, { once: true });
  } else {
    applyConfig();
  }
})();
