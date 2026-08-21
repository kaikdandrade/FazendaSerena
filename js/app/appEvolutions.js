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
      <article class="upgrade-card normalized-upgrade-card redesigned-evolution-card ${maxed ? "evolution-upgrade-completed" : ""} ${journeyLocked ? "upgrade-card-preview" : ""}" data-live-render-key="${kind}:${escapeHtml(item.id)}" data-live-render-signature="${kind}|${level}|${maxed ? 1 : 0}|${journeyLocked ? 1 : 0}|${engine.state.settings.numberFormat || "brazilian"}" data-upgrade-kind="${kind}" data-upgrade-completed="${String(maxed)}">
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
      numberFormat: engine.state.settings.numberFormat || "brazilian",
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
      reconcileLiveCards(dom.researchList, `<div class="empty-state office-empty" data-live-render-key="research-empty" data-live-render-signature="empty">${runtimeTextHtml("emptyResearchCatalog", "Nenhuma pesquisa foi publicada no catálogo administrativo.")}</div>`);
      return;
    }
    const researchUnlocked = engine.isEvolutionUnlocked();
    const researchGate = researchUnlocked ? "" : featureGateMarkup({
      eyebrow: "prévia disponível",
      title: `Pesquisa liberada no nível ${GameEngine.EVOLUTION_UNLOCK_LEVEL}`,
      description: "Explore as tecnologias agora. As compras com pontos de pesquisa ficam disponíveis quando sua fazenda alcançar o nível necessário.",
      level: GameEngine.EVOLUTION_UNLOCK_LEVEL
    });
    const researchMarkup = `${researchGate ? researchGate.replace('<section class="feature-gate-card"', '<section class="feature-gate-card" data-live-render-key="research-gate" data-live-render-signature="gate"') : ""}${engine.data.research.map(item => renderUpgradeCard(item, "research")).join("")}`;
    reconcileLiveCards(dom.researchList, researchMarkup);
    updateEvolutionAffordability("research");
  }

  function renderPrestigeUpgrades() {
    const signature = evolutionRenderSignature(engine.data.prestigeUpgrades, engine.state.prestigeUpgrades, engine.isEvolutionUnlocked());
    if (signature === lastPrestigeRenderSignature) return;
    lastPrestigeRenderSignature = signature;
    if (!engine.data.prestigeUpgrades.length) {
      reconcileLiveCards(dom.prestigeList, `<div class="empty-state office-empty" data-live-render-key="prestige-empty" data-live-render-signature="empty">${runtimeTextHtml("emptyPrestigeCatalog", "Nenhum legado permanente foi publicado no catálogo administrativo.")}</div>`);
      return;
    }
    const unlocked = engine.isEvolutionUnlocked();
    const gate = unlocked ? "" : featureGateMarkup({
      eyebrow: "prévia disponível",
      title: `Legados liberados no nível ${GameEngine.EVOLUTION_UNLOCK_LEVEL}`,
      description: "Você pode conhecer os legados agora. As compras com pontos de prestígio ficam disponíveis junto das Evoluções no nível configurado.",
      level: GameEngine.EVOLUTION_UNLOCK_LEVEL
    });
    const prestigeMarkup = `${gate ? gate.replace('<section class="feature-gate-card"', '<section class="feature-gate-card" data-live-render-key="prestige-gate" data-live-render-signature="gate"') : ""}${engine.data.prestigeUpgrades.map(item => renderUpgradeCard(item, "prestige")).join("")}`;
    reconcileLiveCards(dom.prestigeList, prestigeMarkup);
    updateEvolutionAffordability("prestige");
  }

  function renderPrestigeDashboard() {
    const prestigeBreakdown = engine.getPrestigeBreakdown();
    const gain = prestigeBreakdown.total;
    const prestigeUnlocked = engine.isPrestigeUnlocked();
    const totalCrops = Math.max(0, Number(prestigeBreakdown.totalCrops) || engine.data.crops.length || 0);
    const currentFarmLevel = Math.max(1, Math.min(GameEngine.MAX_FARM_LEVEL, Math.floor(Number(engine.state.farmLevel) || 1)));
    const totalOrderSteps = Math.max(0, Number(engine.data.orderSteps?.length) || 0);
    const completedOrders = totalOrderSteps > 0
      ? engine.data.crops.reduce((count, crop) => {
          const tier = Math.max(0, Math.floor(Number(engine.state.orders?.[crop.id]?.tier) || 0));
          return count + (tier >= totalOrderSteps ? 1 : 0);
        }, 0)
      : 0;
    const drivers = [
      { key: "level", label: "Nível", value: `${currentFarmLevel} / ${GameEngine.MAX_FARM_LEVEL}` },
      { key: "owned", label: "Plantas compradas", value: `${engine.formatNumber(prestigeBreakdown.owned || 0)} / ${engine.formatNumber(totalCrops)}` },
      { key: "mastered", label: "Plantas prestigiadas", value: `${engine.formatNumber(prestigeBreakdown.mastered || 0)} / ${engine.formatNumber(totalCrops)}` },
      { key: "orders", label: "Pedidos finalizados", value: engine.formatNumber(completedOrders) }
    ];
    dom.prestigeDashboard.innerHTML = `
      <section class="prestige-rework ${!prestigeUnlocked ? "prestige-locked" : ""}">
        <div class="prestige-rework-gain">
          <span class="prestige-rework-kicker">${prestigeUnlocked ? "Prestígio desta jornada" : `Disponível no nível ${GameEngine.PRESTIGE_UNLOCK_LEVEL}`}</span>
          <div class="prestige-rework-icon"><img data-prestige-icon="account" src="assets/icons/prestigio.webp" alt=""></div>
          <strong data-prestige-live-gain>${resourceAmount("prestige", gain)}</strong>
          ${prestigeUnlocked ? `<small>O valor final considera o avanço desta jornada e os bônus permanentes.</small>` : ""}
          <div class="prestige-rework-details">${drivers.map(item => `<article><small>${escapeHtml(item.label)}</small><strong data-prestige-live-driver="${item.key}">${item.value}</strong></article>`).join("")}</div>
        </div>
        ${prestigeUnlocked ? `<footer class="prestige-rework-footer">
          <p>Converta a jornada atual em pontos permanentes. A fazenda recomeça; seus legados continuam.</p>
          <button class="button prestige-rework-action" type="button" data-action="perform-prestige" data-prestige-live-action ${gain < 1 ? "disabled" : ""}>Prestigiar</button>
        </footer>` : ""}
      </section>`;
  }

  function showOfficeTab(tabId, updateRoute = true) {
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
    if (updateRoute && activeView === "officeView") updateRouteQuery();
  }

  function showProfileTab(tabId, updateRoute = true) {
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
    if (updateRoute && activeView === "profileView") updateRouteQuery();
    // O conteúdo de Social não é renderizado aqui. showProfileTab é chamado
    // também pelo ciclo de renderização do jogo; recriar o formulário a cada
    // ciclo fazia o campo de código perder o valor e o foco durante a digitação.
    // Amigos e ranking são atualizados apenas por suas rotinas de estado.
  }

