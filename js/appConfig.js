"use strict";

(() => {
  const VERSION_CACHE_KEY = "fazenda-serena-known-version";
  const LOCAL_VERSION_FALLBACK = "1.0.1";
  const normalizeVersion = value => {
    const cleaned = String(value || "").trim().replace(/[^0-9A-Za-z._+-]/g, "").slice(0, 30);
    return cleaned || LOCAL_VERSION_FALLBACK;
  };
  const readKnownVersion = () => {
    try { return normalizeVersion(localStorage.getItem(VERSION_CACHE_KEY) || LOCAL_VERSION_FALLBACK); }
    catch { return LOCAL_VERSION_FALLBACK; }
  };
  let currentVersion = readKnownVersion();

  const experienceDefaults = Object.freeze({ ambient: true, fontScale: 100, numberFormat: "brazilian" });
  const audioDefaults = Object.freeze({ masterVolume: 100, musicVolume: 10, effectVolume: 55, musicTrack: "betweenLightAndShadows" });

  function renderVersion(version = currentVersion) {
    currentVersion = normalizeVersion(version);
    document.querySelectorAll("[data-app-version]").forEach(element => {
      if (element !== document.documentElement) element.textContent = currentVersion;
    });
    document.documentElement.dataset.gameVersion = currentVersion;
    return currentVersion;
  }
  function versionFromConfig(config) {
    if (config?.gameVersion) return normalizeVersion(config.gameVersion);
    const newest = Array.isArray(config?.updateNotes)
      ? config.updateNotes.slice().sort((a,b)=>Number(b?.publishedAt||0)-Number(a?.publishedAt||0))[0]
      : null;
    return normalizeVersion(newest?.version || currentVersion);
  }

  const config = Object.freeze({
    get appVersion(){ return currentVersion; },
    assetCacheVersion: "assets-r37e",
    releaseChannel: "release",
    experienceDefaults,
    audioDefaults,
    applyCloudVersion(version){
      const next=renderVersion(version);
      try { localStorage.setItem(VERSION_CACHE_KEY,next); } catch {}
      if (window.GameEngine) window.GameEngine.APP_VERSION=next;
      window.dispatchEvent(new CustomEvent("fazenda-version-change",{detail:{version:next}}));
      return next;
    },
    versionFromConfig
  });
  Object.defineProperty(window,"FazendaSerenaConfig",{value:config,writable:false,configurable:false,enumerable:true});

  const setRangeDefault=(inputId,textId,value)=>{
    const input=document.getElementById(inputId), text=document.getElementById(textId);
    if(input) input.value=String(value); if(text) text.textContent=`${value}%`;
  };
  const applyDefaults=()=>{
    document.documentElement.dataset.releaseChannel=config.releaseChannel;
    renderVersion(currentVersion);
    const ambient=document.getElementById("ambientSetting");
    const numbers=document.getElementById("numberFormatSetting");
    const music=document.getElementById("musicTrackSetting");
    if(ambient) ambient.checked=experienceDefaults.ambient;
    if(numbers) numbers.value=experienceDefaults.numberFormat;
    if(music) music.value=audioDefaults.musicTrack;
    setRangeDefault("fontScaleSetting","fontScaleText",experienceDefaults.fontScale);
    setRangeDefault("masterVolumeSetting","masterVolumeText",audioDefaults.masterVolume);
    setRangeDefault("musicVolumeSetting","musicVolumeText",audioDefaults.musicVolume);
    setRangeDefault("effectVolumeSetting","effectVolumeText",audioDefaults.effectVolume);
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",applyDefaults,{once:true}); else applyDefaults();
})();
