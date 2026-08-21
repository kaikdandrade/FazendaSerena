"use strict";
  function featureGateMarkup({ eyebrow, title, description, level }) {
    const currentLevel = Math.max(1, Number(engine.state.farmLevel) || 1);
    const requiredLevel = Math.max(1, Number(level) || 1);
    const remaining = Math.max(0, requiredLevel - currentLevel);
    return `<section class="feature-gate-card" aria-live="polite">
      <div class="feature-gate-copy">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)} ${remaining > 0 ? `Faltam ${remaining} ${remaining === 1 ? "nível" : "níveis"}.` : "Disponível agora."}</p>
      </div>
      <span class="feature-gate-level"><small>libera no nível</small><strong>${requiredLevel}</strong></span>
    </section>`;
  }

  function getEvolutionEffectLabel(type) {
    const options = window.GameAdminConfig?.getEvolutionEffectOptions?.() || [];
    return options.find(option => option.value === type)?.label || String(type || "Bônus");
  }

  function getEvolutionBonuses(item) {
    if (Array.isArray(item?.bonuses) && item.bonuses.length) return item.bonuses;
    return [
      { type: item?.bonusType, amount: item?.bonusAmount, stageValues: item?.stageRates },
      { type: item?.bonus2Type, amount: item?.bonus2Amount },
      { type: item?.bonus3Type, amount: item?.bonus3Amount }
    ].filter(effect => Boolean(effect.type));
  }

  function getEvolutionStageAmount(effect, levelIndex) {
    if (Array.isArray(effect?.stageValues) && Number.isFinite(Number(effect.stageValues[levelIndex]))) {
      return Math.max(0, Number(effect.stageValues[levelIndex]) || 0);
    }
    return Math.max(0, Number(effect?.amount) || 0);
  }

  function evolutionBonusMarkup(item, level, { showNext = true } = {}) {
    const effects = getEvolutionBonuses(item);
    if (!effects.length) return "";
    const current = effects.map(effect => {
      let total = 0;
      for (let index = 0; index < level; index += 1) total += getEvolutionStageAmount(effect, index);
      return total > 0 ? `${escapeHtml(getEvolutionEffectLabel(effect.type))}: <b>${engine.formatNumber(total, 3)}</b>` : "";
    }).filter(Boolean);
    const next = level < Number(item.max || 0) ? effects.map(effect => {
      const amount = getEvolutionStageAmount(effect, level);
      return amount > 0 ? `${escapeHtml(getEvolutionEffectLabel(effect.type))}: +${engine.formatNumber(amount, 3)}` : "";
    }).filter(Boolean) : [];
    return `${current.length ? `<span class="evolution-configured-bonus">Atual: ${current.join(" · ")}</span>` : ""}${showNext && next.length ? `<span class="evolution-configured-next">Próximo estágio: ${next.join(" · ")}</span>` : ""}`;
  }

  function renderUpgradeCard(item, kind) {
    const prestigeKind = kind === "prestige";
    const source = prestigeKind ? engine.state.prestigeUpgrades : engine.state.researchTechs;
    const level = Number(source[item.id] || 0);
    const maxed = level >= item.max;
    const cost = maxed ? 0 : engine.getUpgradeCost(item, source);
    const resourceType = prestigeKind ? "prestige" : "research";
    const availableResource = prestigeKind ? engine.state.prestigePoints : engine.state.research;
    const journeyLocked = !engine.isEvolutionUnlocked();
    const affordable = !maxed && !journeyLocked && availableResource >= cost;
    const action = prestigeKind ? "buy-prestige-upgrade" : "buy-research";
    const iconMarkup = typeof item.icon === "string" && /^(?:data:image\/|.*\.(?:png|webp|svg)$)/i.test(item.icon)
      ? `<img src="${escapeHtml(item.icon)}" alt="">`
      : escapeHtml(item.icon);
    const passiveResearch = getEvolutionBonuses(item).some(effect => effect.type === "passiveResearchPercentPerSecond");
    const laboratoryProgress = passiveResearch ? Math.max(0, Math.min(1, Number(engine.state.passiveResearchProgress) || 0)) * 100 : 0;
    const descriptionHtml = `${enrichResourceText(item.desc)}${evolutionBonusMarkup(item, level, { showNext: !prestigeKind })}${passiveResearch && level > 0 ? `<span class="laboratory-progress-value">Progresso do próximo ponto de pesquisa: <b>${laboratoryProgress.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</b>.</span>` : ""}`;
    const buttonLabel = maxed
      ? "Concluído"
      : journeyLocked
        ? `Disponível no nível ${GameEngine.EVOLUTION_UNLOCK_LEVEL}`
        : `${prestigeKind ? "Desenvolver" : "Pesquisar"} ${resourceAmount(resourceType, -cost, { compact: true })}`;
    return `
      <article class="upgrade-card normalized-upgrade-card redesigned-evolution-card ${maxed ? "evolution-upgrade-completed" : ""} ${journeyLocked ? "upgrade-card-preview" : ""}" data-upgrade-kind="${kind}" data-upgrade-completed="${String(maxed)}">
        <div class="upgrade-level-badge">${maxed ? "Nível máximo" : `Nível ${level} / ${item.max}`}</div>
        <div class="upgrade-card-identity">
          <span class="upgrade-icon" aria-hidden="true">${iconMarkup}</span>
          <h3>${escapeHtml(item.name)}</h3>
        </div>
        <p class="upgrade-description">${descriptionHtml}</p>
        <button class="button ${prestigeKind ? "gold" : "primary"} full" type="button" data-action="${action}" data-id="${item.id}" ${maxed || !affordable ? "disabled" : ""}>${buttonLabel}</button>
      </article>`;
  }

  function renderResearch() {
    if (!engine.data.research.length) {
      dom.researchList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyResearchCatalog", "Nenhuma pesquisa foi publicada no catálogo administrativo.")}</div>`;
      return;
    }
    const researchUnlocked = engine.isEvolutionUnlocked();
    const researchGate = researchUnlocked ? "" : featureGateMarkup({
      eyebrow: "prévia disponível",
      title: `Pesquisa liberada no nível ${GameEngine.EVOLUTION_UNLOCK_LEVEL}`,
      description: "Explore as tecnologias agora. As compras com pontos de pesquisa ficam disponíveis quando sua fazenda alcançar o nível necessário.",
      level: GameEngine.EVOLUTION_UNLOCK_LEVEL
    });
    dom.researchList.innerHTML = `${researchGate}${engine.data.research.map(item => renderUpgradeCard(item, "research")).join("")}`;
  }

  function renderPrestigeUpgrades() {
    if (!engine.data.prestigeUpgrades.length) {
      dom.prestigeList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyPrestigeCatalog", "Nenhum legado permanente foi publicado no catálogo administrativo.")}</div>`;
      return;
    }
    const unlocked = engine.isEvolutionUnlocked();
    const gate = unlocked ? "" : featureGateMarkup({
      eyebrow: "prévia disponível",
      title: `Legados liberados no nível ${GameEngine.EVOLUTION_UNLOCK_LEVEL}`,
      description: "Você pode conhecer os legados agora. As compras com pontos de prestígio ficam disponíveis junto das Evoluções no nível configurado.",
      level: GameEngine.EVOLUTION_UNLOCK_LEVEL
    });
    dom.prestigeList.innerHTML = `${gate}${engine.data.prestigeUpgrades.map(item => renderUpgradeCard(item, "prestige")).join("")}`;
  }

  function renderPrestigeDashboard() {
    const gain = engine.getPrestigeEstimate();
    const metrics = engine.getMetrics();
    const prestigeUnlocked = engine.isPrestigeUnlocked();
    const drivers = [
      { label: "Nível da fazenda", value: `${engine.state.farmLevel}`, ready: prestigeUnlocked },
      { label: "Moedas desta jornada", value: resourceAmount("coins", engine.state.stats.runCoinsEarned), ready: engine.state.stats.runCoinsEarned > 0 },
      { label: "Culturas compradas", value: `${metrics.owned} / ${engine.data.crops.length}`, ready: metrics.owned > 0 },
      { label: "Contratos concluídos", value: engine.state.stats.contractsCompleted, ready: engine.state.stats.contractsCompleted > 0 }
    ];
    dom.prestigeDashboard.innerHTML = `
      <section class="prestige-overview-card normalized-prestige-card ${!prestigeUnlocked ? "prestige-locked" : ""}">
        <div class="prestige-copy"><p class="eyebrow">prestígio</p><h2>${prestigeUnlocked ? "Transforme esta jornada em legado" : `Prestígio desbloqueado no nível ${GameEngine.PRESTIGE_UNLOCK_LEVEL}`}</h2><p>${prestigeUnlocked ? "O cálculo usa somente o progresso renovável desta jornada." : `Você já pode visualizar e comprar legados com pontos acumulados. Apenas a ação de prestigiar permanece bloqueada por mais ${Math.max(0, GameEngine.PRESTIGE_UNLOCK_LEVEL - engine.state.farmLevel)} níveis.`}</p></div>
        <div class="prestige-gain-card"><small>Ganho estimado</small><strong>${resourceAmount("prestige", gain)}</strong><span>${prestigeUnlocked ? (engine.state.permanentBonuses.prestigeDouble ? "Bônus permanente 2× ativo" : "Aumente a jornada para ganhar mais") : `Prestígio no nível ${GameEngine.PRESTIGE_UNLOCK_LEVEL}`}</span></div>
      </section>
      <section class="prestige-requirements normalized-prestige-requirements"><div class="prestige-requirements-head"><div><small>Requisitos da jornada</small><h3>Progresso que será convertido</h3></div><span>${prestigeUnlocked && gain > 0 ? "Pronto" : "Em progresso"}</span></div><div class="prestige-driver-grid">${drivers.map(item => `<article class="${item.ready ? "ready" : ""}"><div><small>${item.label}</small><strong>${item.value}</strong></div></article>`).join("")}</div></section>
      <section class="prestige-action-card"><div><strong>Ao prestigiar</strong><p>Moedas, pesquisa, nível, culturas, estoque, tecnologias, contratos e pedidos da jornada serão reiniciados.</p></div><button class="button gold" type="button" data-action="perform-prestige" ${!prestigeUnlocked || gain < 1 ? "disabled" : ""}>${!prestigeUnlocked ? `Prestígio no nível ${GameEngine.PRESTIGE_UNLOCK_LEVEL}` : gain < 1 ? "Ganho insuficiente" : `Prestigiar ${resourceAmount("prestige", gain, { compact: true })}`}</button></section>`;
  }

  function showOfficeTab(tabId) {
    activeOfficeTab = ["contracts", "orders", "evolutions"].includes(tabId) ? tabId : "contracts";
    dom.officeTabs.forEach(tab => {
      const active = tab.dataset.officeTab === activeOfficeTab;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    dom.officePanels.forEach(panel => {
      const active = panel.dataset.officePanel === activeOfficeTab;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  }

  function showProfileTab(tabId) {
    const allowedTabs = ["account", "social", "missions"];
    activeProfileTab = allowedTabs.includes(tabId) ? tabId : "account";
    dom.profileTabs.forEach(tab => {
      const active = tab.dataset.profileTab === activeProfileTab;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    dom.profilePanels.forEach(panel => {
      const active = panel.dataset.profilePanel === activeProfileTab;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
    // O conteúdo de Social não é renderizado aqui. showProfileTab é chamado
    // também pelo ciclo de renderização do jogo; recriar o formulário a cada
    // ciclo fazia o campo de código perder o valor e o foco durante a digitação.
    // Amigos e ranking são atualizados apenas por suas rotinas de estado.
  }

