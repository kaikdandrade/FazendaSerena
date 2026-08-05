"use strict";

/**
 * Motor global de áudio.
 *
 * Os efeitos principais usam um canal interrompível para evitar acúmulo em
 * cliques rápidos. Os impactos dos recursos usam pequenos pools independentes,
 * permitindo que cada partícula toque ao alcançar o contador sem interromper
 * a navegação, a recompensa ou outros impactos que ainda estejam soando.
 */
class SoundEngine {
  static FIXED_MAPPINGS = Object.freeze({
    click: "assets/sounds/interface_click.wav",
    navigation: "assets/sounds/navigation_transition.wav",
    mainNavigation: "assets/sounds/navigation_transition.wav",
    secondaryNavigation: "assets/sounds/navigation_transition.wav",
    cropPurchase: "assets/sounds/crop_purchase.wav",
    upgrade: "assets/sounds/upgrade_confirmation.wav",
    reward: "assets/sounds/reward_claim.wav",
    sell: "assets/sounds/stock_sale.wav",
    prestige: "assets/sounds/prestige_activation.wav",
    levelUp: "assets/sounds/level_up.wav",
    coinCounterHit: "assets/sounds/coin_counter_hit.wav",
    researchCounterHit: "assets/sounds/research_counter_hit.wav",
    prestigeCounterHit: "assets/sounds/prestige_counter_hit.wav"
  });

  static DEFAULT_MAPPINGS = SoundEngine.FIXED_MAPPINGS;

  static RESOURCE_COUNTER_MAPPINGS = Object.freeze({
    coins: "coinCounterHit",
    research: "researchCounterHit",
    prestige: "prestigeCounterHit"
  });

<<<<<<< HEAD
=======
  static RESOURCE_COUNTER_VOLUME = 0.08;

>>>>>>> firebase-dev
  static MUSIC_SOURCES = Object.freeze({
    betweenLightAndShadows: "assets/sounds/music/between_light_and_shadows.wav",
    pixelSprouts: "assets/sounds/music/pixel_sprouts.wav",
    moonlitFields: "assets/sounds/music/moonlit_fields.wav",
    fieldRain: "assets/sounds/music/field_rain.wav",
    electricHarvest: "assets/sounds/music/electric_harvest.wav",
    dirtRoad: "assets/sounds/music/dirt_road.wav",
    enchantedGreenhouse: "assets/sounds/music/enchanted_greenhouse.wav",
    solarFarm: "assets/sounds/music/solar_farm.wav",
    barnHay: "assets/sounds/music/barn_hay.wav",
    harvestFestival: "assets/sounds/music/harvest_festival.wav",
    tropicalOrchard: "assets/sounds/music/tropical_orchard.wav"
  });

  constructor() {
    this.effectChannel = new Audio();
    this.effectChannel.preload = "auto";

    this.concurrentPoolSize = 10;
    this.concurrentPools = new Map();
    this.concurrentPoolCursors = new Map();

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

    const requestedTrack = SoundEngine.MUSIC_SOURCES[settings.musicTrack]
      ? settings.musicTrack
      : "betweenLightAndShadows";

    if (requestedTrack !== this.musicTrack) {
      this.musicTrack = requestedTrack;
      const source = SoundEngine.MUSIC_SOURCES[this.musicTrack];
      const absoluteSource = new URL(source, document.baseURI).href;
      const wasPlaying = !this.musicChannel.paused;
      this.musicChannel.pause();
      if (this.musicChannel.src !== absoluteSource) this.musicChannel.src = source;
      this.musicChannel.currentTime = 0;
      if (wasPlaying) this.playMusic();
    }

    const effectVolume = this.getEffectiveEffectVolume();
    this.effectChannel.volume = effectVolume;
    this.concurrentPools.forEach(pool => pool.forEach(channel => {
      channel.volume = effectVolume;
    }));
    this.musicChannel.volume = this.getEffectiveMusicVolume();

    if (effectVolume <= 0) this.stop();
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

  getEffectPlaybackVolume(options = {}) {
<<<<<<< HEAD
=======
    if (Number.isFinite(options.fixedVolume)) {
      const effectsEnabled = this.masterVolume > 0 && this.effectVolume > 0;
      return effectsEnabled
        ? Math.max(0, Math.min(1, options.fixedVolume))
        : 0;
    }
>>>>>>> firebase-dev
    if (Number.isFinite(options.volume)) {
      return Math.max(0, Math.min(1, options.volume * this.masterVolume));
    }
    return this.getEffectiveEffectVolume();
  }

  play(action, options = {}) {
    const source = options.source ?? SoundEngine.FIXED_MAPPINGS[action];
    const volume = this.getEffectPlaybackVolume(options);
    if (!source || volume <= 0) return false;

    const sequence = ++this.playSequence;
    this.playSource(source, volume, sequence);
    return true;
  }

  playConcurrent(action, options = {}) {
    const source = options.source ?? SoundEngine.FIXED_MAPPINGS[action];
    const volume = this.getEffectPlaybackVolume(options);
    if (!source || volume <= 0) return false;

    const pool = this.getConcurrentPool(source);
    const nextCursor = this.concurrentPoolCursors.get(source) || 0;
    let channelIndex = pool.findIndex(channel => channel.paused || channel.ended);
    if (channelIndex < 0) channelIndex = nextCursor % pool.length;

    const channel = pool[channelIndex];
    this.concurrentPoolCursors.set(source, (channelIndex + 1) % pool.length);
    channel.pause();
    try { channel.currentTime = 0; } catch (_) {}
    channel.volume = volume;

    const playback = channel.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => channel.pause());
    }
    return true;
  }

  playResourceCounterHit(resourceType) {
    const action = SoundEngine.RESOURCE_COUNTER_MAPPINGS[resourceType];
<<<<<<< HEAD
    return action ? this.playConcurrent(action) : false;
=======
    return action
      ? this.playConcurrent(action, { fixedVolume: SoundEngine.RESOURCE_COUNTER_VOLUME })
      : false;
>>>>>>> firebase-dev
  }

  getConcurrentPool(source) {
    if (this.concurrentPools.has(source)) return this.concurrentPools.get(source);

    const pool = Array.from({ length: this.concurrentPoolSize }, () => {
      const channel = new Audio(source);
      channel.preload = "auto";
      channel.volume = this.getEffectiveEffectVolume();
      return channel;
    });

    this.concurrentPools.set(source, pool);
    this.concurrentPoolCursors.set(source, 0);
    return pool;
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

    this.concurrentPools.forEach(pool => pool.forEach(channel => {
      channel.pause();
      try { channel.currentTime = 0; } catch (_) {}
    }));
  }

  playMusic() {
    const volume = this.getEffectiveMusicVolume();
    if (volume <= 0) return false;
    this.musicChannel.volume = volume;
    const playback = this.musicChannel.play();
    if (playback && typeof playback.then === "function") {
      playback
        .then(() => { this.musicStarted = true; })
        .catch(() => { this.musicStarted = false; });
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
