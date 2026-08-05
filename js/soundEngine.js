"use strict";

/**
 * Motor global de áudio de baixa latência.
 *
 * Os efeitos são carregados e decodificados antecipadamente com Web Audio API.
 * Assim, o clique apenas inicia um buffer que já está na memória, sem trocar o
 * arquivo de um elemento <audio> no momento da interação. Navegação e clique
 * também são agendados com um intervalo curto, em vez de esperar um som inteiro
 * terminar. HTMLAudio permanece como compatibilidade para navegadores sem Web
 * Audio ou em caso de falha no carregamento de algum efeito.
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
    contractSignature: "assets/sounds/contract_signature.wav",
    contractRefusal: "assets/sounds/contract_refusal.wav",
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

  static RESOURCE_COUNTER_VOLUME = 0.08;
  static NAVIGATION_DELAY_SECONDS = 0.045;

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
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = AudioContextClass
      ? new AudioContextClass({ latencyHint: "interactive" })
      : null;

    this.effectBuffers = new Map();
    this.effectBufferPromises = new Map();
    this.primarySources = new Set();
    this.concurrentSources = new Set();
    this.primaryFallbackChannels = new Set();
    this.concurrentFallbackChannels = new Set();
    this.fallbackPools = new Map();
    this.fallbackPoolCursors = new Map();
    this.pendingTimers = new Set();
    this.playSequence = 0;

    const audioDefaults = window.FazendaSerenaConfig.audioDefaults;
    this.masterVolume = SoundEngine.toVolume(audioDefaults.masterVolume);
    this.effectVolume = SoundEngine.toVolume(audioDefaults.effectVolume);
    this.musicVolume = SoundEngine.toVolume(audioDefaults.musicVolume);
    this.musicTrack = SoundEngine.MUSIC_SOURCES[audioDefaults.musicTrack]
      ? audioDefaults.musicTrack
      : "betweenLightAndShadows";

    this.musicChannel = new Audio(SoundEngine.MUSIC_SOURCES[this.musicTrack]);
    this.musicChannel.preload = "auto";
    this.musicChannel.loop = true;
    this.musicChannel.playsInline = true;
    this.musicStarted = false;
    try { this.musicChannel.load(); } catch (_) {}

    this.preloadEffects();
  }

  configure(settings = {}) {
    const audioDefaults = window.FazendaSerenaConfig.audioDefaults;
    this.masterVolume = SoundEngine.toVolume(settings.masterVolume ?? audioDefaults.masterVolume);
    this.effectVolume = SoundEngine.toVolume(settings.effectVolume ?? settings.soundVolume ?? audioDefaults.effectVolume);
    this.musicVolume = SoundEngine.toVolume(settings.musicVolume ?? audioDefaults.musicVolume);

    const requestedTrack = SoundEngine.MUSIC_SOURCES[settings.musicTrack]
      ? settings.musicTrack
      : audioDefaults.musicTrack;

    if (requestedTrack !== this.musicTrack) {
      this.musicTrack = requestedTrack;
      const source = SoundEngine.MUSIC_SOURCES[this.musicTrack];
      const absoluteSource = new URL(source, document.baseURI).href;
      const wasPlaying = !this.musicChannel.paused;
      this.musicChannel.pause();
      if (this.musicChannel.src !== absoluteSource) {
        this.musicChannel.src = source;
        try { this.musicChannel.load(); } catch (_) {}
      }
      try { this.musicChannel.currentTime = 0; } catch (_) {}
      if (wasPlaying) this.playMusic();
    }

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

  getEffectPlaybackVolume(options = {}) {
    if (Number.isFinite(options.fixedVolume)) {
      const effectsEnabled = this.masterVolume > 0 && this.effectVolume > 0;
      return effectsEnabled
        ? Math.max(0, Math.min(1, options.fixedVolume))
        : 0;
    }
    if (Number.isFinite(options.volume)) {
      return Math.max(0, Math.min(1, options.volume * this.masterVolume));
    }
    return this.getEffectiveEffectVolume();
  }

  preloadEffects() {
    const uniqueSources = [...new Set(Object.values(SoundEngine.FIXED_MAPPINGS))];
    uniqueSources.forEach(source => {
      this.prepareFallbackPool(source);
      if (!this.audioContext || this.effectBufferPromises.has(source)) return;

      const absoluteSource = new URL(source, document.baseURI).href;
      const request = fetch(absoluteSource, { cache: "force-cache" })
        .then(response => {
          if (!response.ok) throw new Error(`Falha ao carregar áudio: ${response.status}`);
          return response.arrayBuffer();
        })
        .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
        .then(buffer => {
          this.effectBuffers.set(source, buffer);
          return buffer;
        })
        .catch(() => null);

      this.effectBufferPromises.set(source, request);
    });
  }

  prepareFallbackPool(source) {
    if (this.fallbackPools.has(source)) return this.fallbackPools.get(source);

    const poolSize = 4;
    const pool = Array.from({ length: poolSize }, () => {
      const channel = new Audio(source);
      channel.preload = "auto";
      channel.playsInline = true;
      try { channel.load(); } catch (_) {}
      return channel;
    });

    this.fallbackPools.set(source, pool);
    this.fallbackPoolCursors.set(source, 0);
    return pool;
  }

  unlockAudio() {
    if (!this.audioContext || this.audioContext.state === "running") {
      return Promise.resolve(true);
    }

    return this.audioContext.resume()
      .then(() => this.audioContext.state === "running")
      .catch(() => false);
  }

  play(action, options = {}) {
    const source = options.source ?? SoundEngine.FIXED_MAPPINGS[action];
    const volume = this.getEffectPlaybackVolume(options);
    if (!source || volume <= 0) return false;

    const sequence = ++this.playSequence;
    this.stopPrimary();
    this.playPreparedSource(source, volume, {
      sequence,
      group: "primary",
      delaySeconds: 0
    });
    return true;
  }

  playConcurrent(action, options = {}) {
    const source = options.source ?? SoundEngine.FIXED_MAPPINGS[action];
    const volume = this.getEffectPlaybackVolume(options);
    if (!source || volume <= 0) return false;

    this.playPreparedSource(source, volume, {
      sequence: this.playSequence,
      group: "concurrent",
      delaySeconds: 0
    });
    return true;
  }

  playResourceCounterHit(resourceType) {
    const action = SoundEngine.RESOURCE_COUNTER_MAPPINGS[resourceType];
    return action
      ? this.playConcurrent(action, { fixedVolume: SoundEngine.RESOURCE_COUNTER_VOLUME })
      : false;
  }

  playNavigation() {
    const volume = this.getEffectiveEffectVolume();
    if (volume <= 0) return false;

    const sequence = ++this.playSequence;
    this.stopPrimary();
    this.playPreparedSource(SoundEngine.FIXED_MAPPINGS.click, volume, {
      sequence,
      group: "primary",
      delaySeconds: 0
    });
    this.playPreparedSource(SoundEngine.FIXED_MAPPINGS.navigation, volume, {
      sequence,
      group: "primary",
      delaySeconds: SoundEngine.NAVIGATION_DELAY_SECONDS
    });
    return true;
  }

  playPreparedSource(source, volume, options) {
    this.unlockAudio();

    const buffer = this.effectBuffers.get(source);
    if (buffer && this.audioContext) {
      this.playDecodedBuffer(buffer, volume, options);
      return;
    }

    this.playFallback(source, volume, options);
  }

  playDecodedBuffer(buffer, volume, { sequence, group, delaySeconds = 0 }) {
    const context = this.audioContext;
    if (!context) return;

    const sourceNode = context.createBufferSource();
    const gainNode = context.createGain();
    const collection = group === "primary" ? this.primarySources : this.concurrentSources;
    const startAt = context.currentTime + Math.max(0, delaySeconds);

    sourceNode.buffer = buffer;
    gainNode.gain.setValueAtTime(volume, startAt);
    sourceNode.connect(gainNode);
    gainNode.connect(context.destination);
    collection.add(sourceNode);

    sourceNode.onended = () => {
      collection.delete(sourceNode);
      try { sourceNode.disconnect(); } catch (_) {}
      try { gainNode.disconnect(); } catch (_) {}
    };

    try {
      if (group === "primary" && sequence !== this.playSequence) return;
      sourceNode.start(startAt);
    } catch (_) {
      collection.delete(sourceNode);
    }
  }

  playFallback(source, volume, { sequence, group, delaySeconds = 0 }) {
    const playNow = () => {
      if (group === "primary" && sequence !== this.playSequence) return;

      const pool = this.prepareFallbackPool(source);
      const cursor = this.fallbackPoolCursors.get(source) || 0;
      let channelIndex = pool.findIndex(channel => channel.paused || channel.ended);
      if (channelIndex < 0) channelIndex = cursor % pool.length;

      const channel = pool[channelIndex];
      const collection = group === "primary"
        ? this.primaryFallbackChannels
        : this.concurrentFallbackChannels;

      this.fallbackPoolCursors.set(source, (channelIndex + 1) % pool.length);
      channel.pause();
      try { channel.currentTime = 0; } catch (_) {}
      channel.volume = volume;
      collection.add(channel);

      const cleanup = () => collection.delete(channel);
      channel.onended = cleanup;
      channel.onerror = cleanup;

      const playback = channel.play();
      if (playback && typeof playback.catch === "function") {
        playback.catch(cleanup);
      }
    };

    const delayMs = Math.max(0, delaySeconds * 1000);
    if (delayMs <= 0) {
      playNow();
      return;
    }

    const timer = window.setTimeout(() => {
      this.pendingTimers.delete(timer);
      playNow();
    }, delayMs);
    this.pendingTimers.add(timer);
  }

  stopPrimary() {
    this.primarySources.forEach(sourceNode => {
      try { sourceNode.stop(); } catch (_) {}
    });
    this.primarySources.clear();

    this.primaryFallbackChannels.forEach(channel => {
      channel.pause();
      channel.onended = null;
      channel.onerror = null;
      try { channel.currentTime = 0; } catch (_) {}
    });
    this.primaryFallbackChannels.clear();

    this.pendingTimers.forEach(timer => window.clearTimeout(timer));
    this.pendingTimers.clear();
  }

  stop() {
    this.playSequence += 1;
    this.stopPrimary();

    this.concurrentSources.forEach(sourceNode => {
      try { sourceNode.stop(); } catch (_) {}
    });
    this.concurrentSources.clear();

    this.concurrentFallbackChannels.forEach(channel => {
      channel.pause();
      channel.onended = null;
      channel.onerror = null;
      try { channel.currentTime = 0; } catch (_) {}
    });
    this.concurrentFallbackChannels.clear();
  }

  playMusic() {
    const volume = this.getEffectiveMusicVolume();
    if (volume <= 0) return false;

    this.unlockAudio();
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
    this.unlockAudio();
    return this.playMusic();
  }
}

window.SoundEngine = SoundEngine;
