"use strict";

/**
 * Motor global de áudio.
 *
 * Os efeitos compartilham um único canal para impedir sobreposição em cliques
 * rápidos. A navegação usa uma sequência curta: clique suave e, quando ele
 * termina, o som de transição. A música usa um canal independente e contínuo.
 */
class SoundEngine {
  static FIXED_MAPPINGS = Object.freeze({
    click: "assets/sounds/01A_interface_click_soft_pop.wav",
    navigation: "assets/sounds/02_navigation.wav",
    mainNavigation: "assets/sounds/02_navigation.wav",
    secondaryNavigation: "assets/sounds/02_navigation.wav",
    upgrade: "assets/sounds/07_upgrade_order_mission.wav",
    reward: "assets/sounds/03_reward.wav",
    sell: "assets/sounds/06_sell_items.wav",
    prestige: "assets/sounds/05_prestige.wav",
    levelUp: "assets/sounds/04_level_up.wav"
  });

  static DEFAULT_MAPPINGS = SoundEngine.FIXED_MAPPINGS;
  static MUSIC_SOURCES = Object.freeze({
    betweenLightAndShadows: "assets/sounds/music/entre_luz_sombras.wav",
    pixelSprouts: "assets/sounds/music/brotos_pixelados.wav",
    moonlitFields: "assets/sounds/music/campos_ao_luar.wav",
    fieldRain: "assets/sounds/music/chuva_no_campo.wav",
    electricHarvest: "assets/sounds/music/colheita_eletrizante.wav",
    dirtRoad: "assets/sounds/music/estrada_de_terra.wav",
    enchantedGreenhouse: "assets/sounds/music/estufa_encantada.wav",
    solarFarm: "assets/sounds/music/fazenda_solar.wav",
    barnHay: "assets/sounds/music/feno_do_celeiro.wav",
    harvestFestival: "assets/sounds/music/festa_da_colheita.wav",
    tropicalOrchard: "assets/sounds/music/pomar_tropical.wav"
  });

  constructor() {
    this.effectChannel = new Audio();
    this.effectChannel.preload = "auto";

    this.musicTrack = "betweenLightAndShadows";
    this.musicChannel = new Audio(SoundEngine.MUSIC_SOURCES[this.musicTrack]);
    this.musicChannel.preload = "auto";
    this.musicChannel.loop = true;

    this.masterVolume = 1;
    this.effectVolume = 0.55;
    this.musicVolume = 0.30;
    this.playSequence = 0;
    this.musicStarted = false;
  }

  configure(settings = {}) {
    this.masterVolume = SoundEngine.toVolume(settings.masterVolume ?? 100);
    this.effectVolume = SoundEngine.toVolume(settings.effectVolume ?? settings.soundVolume ?? 55);
    this.musicVolume = SoundEngine.toVolume(settings.musicVolume ?? 30);

    const requestedTrack = SoundEngine.MUSIC_SOURCES[settings.musicTrack] ? settings.musicTrack : "betweenLightAndShadows";
    if (requestedTrack !== this.musicTrack) {
      this.musicTrack = requestedTrack;
      const absoluteSource = new URL(SoundEngine.MUSIC_SOURCES[this.musicTrack], document.baseURI).href;
      const wasPlaying = !this.musicChannel.paused;
      this.musicChannel.pause();
      if (this.musicChannel.src !== absoluteSource) this.musicChannel.src = SoundEngine.MUSIC_SOURCES[this.musicTrack];
      this.musicChannel.currentTime = 0;
      if (wasPlaying) this.playMusic();
    }

    this.effectChannel.volume = this.getEffectiveEffectVolume();
    this.musicChannel.volume = this.getEffectiveMusicVolume();

    if (this.getEffectiveEffectVolume() <= 0) this.stop();
    if (this.getEffectiveMusicVolume() <= 0) this.pauseMusic();
    else this.playMusic();
  }

  static toVolume(value) {
    return Math.max(0, Math.min(1, (Number(value) || 0) / 100));
  }

  getEffectiveEffectVolume() {
    return Math.max(0, Math.min(1, this.masterVolume * this.effectVolume));
  }

  getEffectiveMusicVolume() {
    return Math.max(0, Math.min(1, this.masterVolume * this.musicVolume));
  }

  play(action, options = {}) {
    const source = options.source ?? SoundEngine.FIXED_MAPPINGS[action];
    const volume = Number.isFinite(options.volume)
      ? Math.max(0, Math.min(1, options.volume * this.masterVolume))
      : this.getEffectiveEffectVolume();
    if (!source || volume <= 0) return false;

    const sequence = ++this.playSequence;
    this.playSource(source, volume, sequence);
    return true;
  }

  playNavigation() {
    const volume = this.getEffectiveEffectVolume();
    if (volume <= 0) return false;

    const sequence = ++this.playSequence;
    this.playSource(SoundEngine.FIXED_MAPPINGS.click, volume, sequence, () => {
      if (sequence !== this.playSequence) return;
      this.playSource(SoundEngine.FIXED_MAPPINGS.navigation, volume, sequence);
    });
    return true;
  }

  playSource(source, volume, sequence, onEnded = null) {
    this.effectChannel.pause();
    this.effectChannel.onended = null;
    this.effectChannel.onerror = null;
    try { this.effectChannel.currentTime = 0; } catch (_) {}

    const absoluteSource = new URL(source, document.baseURI).href;
    if (this.effectChannel.src !== absoluteSource) this.effectChannel.src = source;
    this.effectChannel.volume = volume;

    if (typeof onEnded === "function") {
      this.effectChannel.onended = () => {
        if (sequence === this.playSequence) onEnded();
      };
    }

    const playback = this.effectChannel.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => {
        if (sequence === this.playSequence) this.effectChannel.pause();
      });
    }
  }

  stop() {
    this.playSequence += 1;
    this.effectChannel.pause();
    this.effectChannel.onended = null;
    this.effectChannel.onerror = null;
    try { this.effectChannel.currentTime = 0; } catch (_) {}
  }

  playMusic() {
    const volume = this.getEffectiveMusicVolume();
    if (volume <= 0) return false;
    this.musicChannel.volume = volume;
    const playback = this.musicChannel.play();
    if (playback && typeof playback.then === "function") {
      playback.then(() => { this.musicStarted = true; }).catch(() => { this.musicStarted = false; });
    }
    return true;
  }

  pauseMusic() {
    this.musicChannel.pause();
    this.musicStarted = false;
  }

  resumeMusic() {
    return this.playMusic();
  }
}

window.SoundEngine = SoundEngine;
