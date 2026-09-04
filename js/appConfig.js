"use strict";

(() => {
  const SITE_VERSION = "1.2.0";
  const experienceDefaults = Object.freeze({ ambient: true, fontScale: 100, numberFormat: "brazilian", appearanceMode: "automatic" });
  const audioDefaults = Object.freeze({ masterVolume: 100, musicVolume: 10, effectVolume: 55, musicTrack: "betweenLightAndShadows" });

  const config = Object.freeze({
    siteVersion: SITE_VERSION,
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

  const applyDefaults = () => {
    document.querySelectorAll("[data-site-version]").forEach(element => {
      element.textContent = SITE_VERSION;
    });

    const ambient = document.getElementById("ambientSetting");
    const numbers = document.getElementById("numberFormatSetting");
    const appearance = document.getElementById("appearanceModeSetting");
    const music = document.getElementById("musicTrackSetting");

    if (ambient) ambient.checked = experienceDefaults.ambient;
    if (numbers) numbers.value = experienceDefaults.numberFormat;
    if (appearance) appearance.value = experienceDefaults.appearanceMode;
    if (music) music.value = audioDefaults.musicTrack;

    setRangeDefault("fontScaleSetting", "fontScaleText", experienceDefaults.fontScale);
    setRangeDefault("masterVolumeSetting", "masterVolumeText", audioDefaults.masterVolume);
    setRangeDefault("musicVolumeSetting", "musicVolumeText", audioDefaults.musicVolume);
    setRangeDefault("effectVolumeSetting", "effectVolumeText", audioDefaults.effectVolume);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyDefaults, { once: true });
  else applyDefaults();
})();
