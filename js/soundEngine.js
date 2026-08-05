"use strict";

/**
 * Motor global de efeitos sonoros.
 *
 * Todos os efeitos usam um único canal. Quando uma nova interação acontece,
 * o efeito anterior é interrompido antes do próximo começar. Isso evita que
 * cliques rápidos ou vários aprimoramentos empilhem sons no ouvido do jogador.
 */
class SoundEngine {
  static ACTIONS = Object.freeze([
    { id: "click", label: "Clique de interface", description: "Botões e controles gerais." },
    { id: "mainNavigation", label: "Navegação principal", description: "Fazenda, Estoque, Evoluções, Escritório e Configurações." },
    { id: "secondaryNavigation", label: "Navegação secundária", description: "Subabas de Evoluções e Escritório." },
    { id: "upgrade", label: "Aprimoramento", description: "Culturas, aprimoramentos, pesquisas e legados." },
    { id: "reward", label: "Recompensa", description: "Contratos, pedidos e missões coletados." },
    { id: "sell", label: "Venda", description: "Vendas manuais e venda geral do estoque." },
    { id: "prestige", label: "Prestigiar", description: "Início de uma nova jornada." },
    { id: "levelUp", label: "Subida de nível", description: "Quando o nível da fazenda aumenta." }
  ]);

  static FILES = Object.freeze([
    { path: "", label: "Sem som" },
    { path: "assets/sounds/01A_interface_click_soft_pop.wav", label: "Clique suave" },
    { path: "assets/sounds/01B_interface_click_felt_button.wav", label: "Clique de feltro" },
    { path: "assets/sounds/01C_interface_click_clean_crystal.wav", label: "Clique cristalino" },
    { path: "assets/sounds/01D_interface_click.wav", label: "Clique clássico" },
    { path: "assets/sounds/01E_interface_click_v2.wav", label: "Clique alternativo" },
    { path: "assets/sounds/02_navigation.wav", label: "Navegação clássica" },
    { path: "assets/sounds/02_navigation_v2.wav", label: "Navegação alternativa" },
    { path: "assets/sounds/02_navigation_screen_slide_v4.wav", label: "Deslize de tela" },
    { path: "assets/sounds/02_navigation_whoosh_v3.wav", label: "Whoosh de navegação A" },
    { path: "assets/sounds/02_navigation_whoosh_v3 (1).wav", label: "Whoosh de navegação B" },
    { path: "assets/sounds/02_navigation_whoosh_v3 (2).wav", label: "Whoosh de navegação C" },
    { path: "assets/sounds/02_navigation_whoosh_v3 (3).wav", label: "Whoosh de navegação D" },
    { path: "assets/sounds/02A_navigation_mystic_slide_right_v5.wav", label: "Deslize místico para a direita" },
    { path: "assets/sounds/02B_navigation_mystic_slide_left_v5.wav", label: "Deslize místico para a esquerda" },
    { path: "assets/sounds/navigation_farm_game_v6.wav", label: "Navegação da fazenda" },
    { path: "assets/sounds/03_reward.wav", label: "Recompensa" },
    { path: "assets/sounds/04_level_up.wav", label: "Subida de nível" },
    { path: "assets/sounds/05_prestige.wav", label: "Prestígio" },
    { path: "assets/sounds/06_sell_items.wav", label: "Venda de itens" },
    { path: "assets/sounds/07_upgrade_order_mission.wav", label: "Aprimoramento e missão A" },
    { path: "assets/sounds/07_upgrade_order_mission_v2.wav", label: "Aprimoramento e missão B" },
    { path: "assets/sounds/07_upgrade_three_note_signature_v4.wav", label: "Aprimoramento em três notas" },
    { path: "assets/sounds/07_upgrade_3D_three_hits_v3.wav", label: "Aprimoramento em três impactos A" },
    { path: "assets/sounds/07_upgrade_3D_three_hits_v3 (1).wav", label: "Aprimoramento em três impactos B" },
    { path: "assets/sounds/07_upgrade_four_note_high_plim_v5.wav", label: "Aprimoramento em quatro notas" },
    { path: "assets/sounds/level_up_fusao_suprema_v1.wav", label: "Subida de nível intensa" },
    { path: "assets/sounds/08_calm_farm_loop_32s.wav", label: "Loop calmo da fazenda" },
    { path: "assets/sounds/08_calm_farm_loop_violin_piano_v2.wav", label: "Loop de violino e piano" }
  ]);

  static DEFAULT_MAPPINGS = Object.freeze({
    click: "assets/sounds/01A_interface_click_soft_pop.wav",
    mainNavigation: "assets/sounds/02_navigation_whoosh_v3.wav",
    secondaryNavigation: "assets/sounds/02_navigation_screen_slide_v4.wav",
    upgrade: "assets/sounds/07_upgrade_three_note_signature_v4.wav",
    reward: "assets/sounds/03_reward.wav",
    sell: "assets/sounds/06_sell_items.wav",
    prestige: "assets/sounds/05_prestige.wav",
    levelUp: "assets/sounds/04_level_up.wav"
  });

  constructor() {
    this.channel = new Audio();
    this.channel.preload = "auto";
    this.enabled = true;
    this.volume = 0.55;
    this.mappings = { ...SoundEngine.DEFAULT_MAPPINGS };
    this.playSequence = 0;
  }

  configure(settings = {}) {
    this.enabled = settings.soundEnabled !== false;
    this.volume = Math.max(0, Math.min(1, (Number(settings.soundVolume) || 0) / 100));
    this.mappings = {
      ...SoundEngine.DEFAULT_MAPPINGS,
      ...(settings.soundMappings && typeof settings.soundMappings === "object" ? settings.soundMappings : {})
    };
    this.channel.volume = this.volume;
    if (!this.enabled) this.stop();
  }

  play(action, options = {}) {
    const source = options.source ?? this.mappings[action];
    if (!this.enabled || !source) return false;

    this.playSequence += 1;
    const sequence = this.playSequence;
    this.channel.pause();
    this.channel.currentTime = 0;
    if (this.channel.src !== new URL(source, document.baseURI).href) this.channel.src = source;
    this.channel.volume = Math.max(0, Math.min(1, Number.isFinite(options.volume) ? options.volume : this.volume));
    this.channel.currentTime = 0;

    const playback = this.channel.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => {
        if (sequence === this.playSequence) this.channel.pause();
      });
    }
    return true;
  }

  preview(source) {
    return this.play("preview", { source });
  }

  stop() {
    this.playSequence += 1;
    this.channel.pause();
    this.channel.currentTime = 0;
  }

  static getActions() {
    return SoundEngine.ACTIONS.map(action => ({ ...action }));
  }

  static getFiles() {
    return SoundEngine.FILES.map(file => ({ ...file }));
  }
}

window.SoundEngine = SoundEngine;
