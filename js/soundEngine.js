"use strict";

/**
 * Motor global de áudio.
 *
 * Efeitos usam um único canal: um novo efeito interrompe o anterior para evitar
 * sobreposição em cliques rápidos. A música ambiente usa um canal separado,
 * permanece em loop e possui volume próprio.
 */
class SoundEngine {
  static NAVIGATION_ACTIONS = Object.freeze([
    { id: "mainNavigation", label: "Navegação principal", description: "Fazenda, Estoque, Evoluções, Escritório e Configurações." },
    { id: "secondaryNavigation", label: "Navegação secundária", description: "Subabas de Evoluções e Escritório." }
  ]);

  static NAVIGATION_FILES = Object.freeze([
    { path: "", label: "Sem som" },
    { path: "assets/sounds/02_navigation.wav", label: "Navegação clássica" },
    { path: "assets/sounds/02_navigation_v2.wav", label: "Navegação alternativa" },
    { path: "assets/sounds/02_navigation_screen_slide_v4.wav", label: "Deslize de tela" },
    { path: "assets/sounds/02_navigation_whoosh_v3.wav", label: "Whoosh de navegação A" },
    { path: "assets/sounds/02_navigation_whoosh_v3 (1).wav", label: "Whoosh de navegação B" },
    { path: "assets/sounds/02_navigation_whoosh_v3 (2).wav", label: "Whoosh de navegação C" },
    { path: "assets/sounds/02_navigation_whoosh_v3 (3).wav", label: "Whoosh de navegação D" },
    { path: "assets/sounds/02A_navigation_mystic_slide_right_v5.wav", label: "Deslize místico para a direita" },
    { path: "assets/sounds/02B_navigation_mystic_slide_left_v5.wav", label: "Deslize místico para a esquerda" },
    { path: "assets/sounds/navigation_farm_game_v6.wav", label: "Navegação da fazenda" }
  ]);

  static FIXED_MAPPINGS = Object.freeze({
    click: "assets/sounds/01A_interface_click_soft_pop.wav",
    upgrade: "assets/sounds/07_upgrade_order_mission.wav",
    reward: "assets/sounds/03_reward.wav",
    sell: "assets/sounds/06_sell_items.wav",
    prestige: "assets/sounds/05_prestige.wav",
    levelUp: "assets/sounds/04_level_up.wav"
  });

  static DEFAULT_MAPPINGS = Object.freeze({
    ...SoundEngine.FIXED_MAPPINGS,
    mainNavigation: "assets/sounds/02_navigation_whoosh_v3.wav",
    secondaryNavigation: "assets/sounds/02_navigation_screen_slide_v4.wav"
  });

  static MUSIC_SOURCE = "assets/sounds/08_calm_farm_loop_32s.wav";

  constructor() {
    this.effectChannel = new Audio();
    this.effectChannel.preload = "auto";

    this.musicChannel = new Audio(SoundEngine.MUSIC_SOURCE);
    this.musicChannel.preload = "auto";
    this.musicChannel.loop = true;

    this.effectsEnabled = true;
    this.musicEnabled = true;
    this.effectVolume = 0.55;
    this.musicVolume = 0.32;
    this.mappings = { ...SoundEngine.DEFAULT_MAPPINGS };
    this.playSequence = 0;
    this.musicStarted = false;
  }

  configure(settings = {}) {
    this.effectsEnabled = settings.soundEnabled !== false;
    this.musicEnabled = settings.musicEnabled !== false;
    this.effectVolume = Math.max(0, Math.min(1, (Number(settings.soundVolume) || 0) / 100));
    this.musicVolume = Math.max(0, Math.min(1, (Number(settings.musicVolume) || 0) / 100));

    const custom = settings.soundMappings && typeof settings.soundMappings === "object"
      ? settings.soundMappings
      : {};
    this.mappings = {
      ...SoundEngine.FIXED_MAPPINGS,
      mainNavigation: custom.mainNavigation ?? SoundEngine.DEFAULT_MAPPINGS.mainNavigation,
      secondaryNavigation: custom.secondaryNavigation ?? SoundEngine.DEFAULT_MAPPINGS.secondaryNavigation
    };

    this.effectChannel.volume = this.effectVolume;
    this.musicChannel.volume = this.musicVolume;

    if (!this.effectsEnabled) this.stop();
    if (!this.musicEnabled || this.musicVolume <= 0) this.pauseMusic();
    else this.playMusic();
  }

  play(action, options = {}) {
    const source = options.source ?? this.mappings[action];
    if (!this.effectsEnabled || !source) return false;

    this.playSequence += 1;
    const sequence = this.playSequence;
    this.effectChannel.pause();
    this.effectChannel.currentTime = 0;
    if (this.effectChannel.src !== new URL(source, document.baseURI).href) this.effectChannel.src = source;
    this.effectChannel.volume = Math.max(0, Math.min(1, Number.isFinite(options.volume) ? options.volume : this.effectVolume));

    const playback = this.effectChannel.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => {
        if (sequence === this.playSequence) this.effectChannel.pause();
      });
    }
    return true;
  }

  preview(source) {
    return this.play("preview", { source });
  }

  stop() {
    this.playSequence += 1;
    this.effectChannel.pause();
    this.effectChannel.currentTime = 0;
  }

  playMusic() {
    if (!this.musicEnabled || this.musicVolume <= 0) return false;
    this.musicChannel.volume = this.musicVolume;
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

  static getActions() {
    return SoundEngine.NAVIGATION_ACTIONS.map(action => ({ ...action }));
  }

  static getFiles() {
    return SoundEngine.NAVIGATION_FILES.map(file => ({ ...file }));
  }
}

window.SoundEngine = SoundEngine;
