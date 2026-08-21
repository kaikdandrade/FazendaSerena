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
    const iconMarkup = journeyLocked
      ? `<img src="assets/icons/cadeado.webp" alt="Bloqueado">`
      : (typeof item.icon === "string" && /^(?:data:image\/|.*\.(?:png|webp|svg)$)/i.test(item.icon)
        ? `<img src="${escapeHtml(item.icon)}" alt="">`
        : escapeHtml(item.icon));
    const descriptionHtml = enrichResourceText(item.desc);
    const buttonLabel = maxed
      ? "Concluído"
      : journeyLocked
        ? `Disponível no nível ${GameEngine.EVOLUTION_UNLOCK_LEVEL}`
        : `${prestigeKind ? "Desenvolver" : "Pesquisar"} ${resourceAmount(resourceType, -cost, { compact: true })}`;
    return `
      <article class="upgrade-card normalized-upgrade-card redesigned-evolution-card ${maxed ? "evolution-upgrade-completed" : ""} ${journeyLocked ? "upgrade-card-preview" : ""}" data-upgrade-kind="${kind}" data-upgrade-completed="${String(maxed)}">
        <div class="upgrade-level-badge" aria-label="${maxed ? `Nível máximo ${item.max}` : `Nível ${level} de ${item.max}`}"><strong>${maxed ? "Máximo" : `Nível ${level}/${item.max}`}</strong></div>
        <div class="upgrade-card-identity">
          <span class="upgrade-icon" aria-hidden="true">${iconMarkup}</span>
          <h3>${escapeHtml(item.name)}</h3>
        </div>
        <p class="upgrade-description">${descriptionHtml}</p>
        <button class="button ${prestigeKind ? "gold" : "primary"} full" type="button" data-action="${action}" data-id="${item.id}" ${maxed || !affordable ? "disabled" : ""}>${buttonLabel}</button>
      </article>`;
  }

  function evolutionRenderSignature(items, levels, unlocked) {
    // A assinatura contém apenas o que muda a ESTRUTURA do card. Saldo de
    // pesquisa/prestígio, XP e ticks passivos jamais entram aqui. Assim o DOM
    // da tela de Evoluções permanece estável e não é destruído/recriado no
    // game loop — o antigo efeito visual de "refresh" desaparece.
    return JSON.stringify({
      unlocked: Boolean(unlocked),
      cards: (items || []).map(item => {
        const level = Math.max(0, Number(levels?.[item.id]) || 0);
        const maxed = level >= Number(item.max || 0);
        return [
          item.id, item.name, item.icon, item.desc, item.max, item.baseCost, item.growth,
          item.stageCosts || [], item.bonuses || [], level, maxed
        ];
      })
    });
  }

  function updateEvolutionAffordability(kind) {
    const prestigeKind = kind === "prestige";
    const list = prestigeKind ? dom.prestigeList : dom.researchList;
    const items = prestigeKind ? engine.data.prestigeUpgrades : engine.data.research;
    const source = prestigeKind ? engine.state.prestigeUpgrades : engine.state.researchTechs;
    const available = prestigeKind ? engine.state.prestigePoints : engine.state.research;
    const unlocked = engine.isEvolutionUnlocked();
    if (!list) return;
    list.querySelectorAll(`[data-upgrade-kind="${kind}"]`).forEach(card => {
      const button = card.querySelector(`[data-action="${prestigeKind ? "buy-prestige-upgrade" : "buy-research"}"]`);
      const id = button?.dataset.id;
      const item = items.find(entry => entry.id === id);
      if (!button || !item) return;
      const level = Math.max(0, Number(source[item.id]) || 0);
      const maxed = level >= Number(item.max || 0);
      const cost = maxed ? 0 : engine.getUpgradeCost(item, source);
      button.disabled = maxed || !unlocked || Number(available || 0) < cost;
    });
  }

  function renderResearch() {
    const signature = evolutionRenderSignature(engine.data.research, engine.state.researchTechs, engine.isEvolutionUnlocked());
    if (signature === lastResearchRenderSignature) return;
    lastResearchRenderSignature = signature;
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
    updateEvolutionAffordability("research");
  }

  function renderPrestigeUpgrades() {
    const signature = evolutionRenderSignature(engine.data.prestigeUpgrades, engine.state.prestigeUpgrades, engine.isEvolutionUnlocked());
    if (signature === lastPrestigeRenderSignature) return;
    lastPrestigeRenderSignature = signature;
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
    updateEvolutionAffordability("prestige");
  }

  function renderPrestigeDashboard() {
    const prestigeBreakdown = engine.getPrestigeBreakdown();
    const gain = prestigeBreakdown.total;
    const prestigeUnlocked = engine.isPrestigeUnlocked();
    const cropStates = engine.data.crops.map(crop => engine.state.crops?.[crop.id] || {});
    const averageCropLevel = cropStates.length
      ? Math.floor(cropStates.reduce((sum, item) => sum + Math.max(0, Number(item.level) || 0), 0) / cropStates.length)
      : 0;
    const drivers = [
      { label: "Níveis acima do desbloqueio", value: `${Math.max(0, engine.state.farmLevel - GameEngine.PRESTIGE_UNLOCK_LEVEL)} / ${Math.max(0, GameEngine.MAX_FARM_LEVEL - GameEngine.PRESTIGE_UNLOCK_LEVEL)}`, ready: prestigeBreakdown.level > 0 },
      { label: "Culturas compradas", value: `${prestigeBreakdown.owned || 0} / ${prestigeBreakdown.totalCrops || engine.data.crops.length}`, ready: (prestigeBreakdown.owned || 0) > 0 },
      { label: "Nível médio das plantas", value: `${averageCropLevel} / ${GameEngine.MAX_CROP_LEVEL}`, ready: prestigeBreakdown.upgrades > 0 },
      { label: "Plantas platinadas", value: `${prestigeBreakdown.mastered || 0} / ${prestigeBreakdown.totalCrops || engine.data.crops.length}`, ready: (prestigeBreakdown.mastered || 0) > 0 }
    ];
    dom.prestigeDashboard.innerHTML = `
      <section class="prestige-overview-card normalized-prestige-card ${!prestigeUnlocked ? "prestige-locked" : ""}">
        <div class="prestige-copy"><p class="eyebrow">prestígio</p><h2>${prestigeUnlocked ? "Transforme esta jornada em legado" : `Prestígio desbloqueado no nível ${GameEngine.PRESTIGE_UNLOCK_LEVEL}`}</h2><p>${prestigeUnlocked ? "O nível de desbloqueio é a base e não concede pontos. O ganho vem dos níveis acima dele e do progresso das plantas." : `Você já pode visualizar e comprar legados com pontos acumulados. Apenas a ação de prestigiar permanece bloqueada por mais ${Math.max(0, GameEngine.PRESTIGE_UNLOCK_LEVEL - engine.state.farmLevel)} níveis.`}</p></div>
        <div class="prestige-gain-card"><small>Ganho estimado</small><strong>${resourceAmount("prestige", gain)}</strong><span>${prestigeUnlocked ? (engine.state.permanentBonuses.prestigeDouble ? "Bônus permanente 2× ativo" : "Aumente a jornada para ganhar mais") : `Prestígio no nível ${GameEngine.PRESTIGE_UNLOCK_LEVEL}`}</span></div>
      </section>
      <section class="prestige-requirements normalized-prestige-requirements"><div class="prestige-requirements-head"><div><small>Requisitos da jornada</small><h3>Progresso que será convertido</h3></div><span>${prestigeUnlocked && gain > 0 ? "Pronto" : "Em progresso"}</span></div><div class="prestige-driver-grid">${drivers.map(item => `<article class="${item.ready ? "ready" : ""}"><div><small>${item.label}</small><strong>${item.value}</strong></div></article>`).join("")}</div></section>
      <section class="prestige-action-card"><div><strong>Ao prestigiar</strong><p>Moedas, pesquisa, nível, culturas, estoque, tecnologias, contratos e pedidos da jornada serão reiniciados.</p></div><button class="button gold" type="button" data-action="perform-prestige" ${!prestigeUnlocked || gain < 1 ? "disabled" : ""}>${!prestigeUnlocked ? `Prestígio no nível ${GameEngine.PRESTIGE_UNLOCK_LEVEL}` : gain < 1 ? "Ganho insuficiente" : `Prestigiar ${resourceAmount("prestige", gain, { compact: true })}`}</button></section>`;
  }

  function showOfficeTab(tabId) {
    activeOfficeTab = ["contracts", "orders", "evolutions"].includes(tabId) ? tabId : "contracts";
    dom.officeTabs.forEach(tab => {
      const active = activeView === "officeView" && tab.dataset.officeTab === activeOfficeTab;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
      if (active) tab.setAttribute("aria-current", "page"); else tab.removeAttribute("aria-current");
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
      const active = activeView === "profileView" && tab.dataset.profileTab === activeProfileTab;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
      if (active) tab.setAttribute("aria-current", "page"); else tab.removeAttribute("aria-current");
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

