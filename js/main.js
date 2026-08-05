"use strict";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const pendingEvents = [];
  let engine = null;
  let lastFrame = performance.now();
  let lastRender = 0;
  let lastLiveHeader = 0;
  let lastCropControls = 0;
  let lastSave = 0;
  let activeView = "farmView";
  let activeOfficeTab = "contracts";
  let activeEvolutionTab = "upgrades";

  const dom = {
    tabs: $$(".nav-tab[data-view]"),
    views: $$("[data-view-panel]"),
    cropGrid: $("#cropGrid"),
    cropEmpty: $("#cropEmpty"),
    searchCrop: $("#searchCrop"),
    categoryFilter: $("#categoryFilter"),
    stockGrid: $("#stockGrid"),
    stockSummary: $("#stockSummary"),
    upgradeList: $("#upgradeList"),
    researchList: $("#researchList"),
    prestigeDashboard: $("#prestigeDashboard"),
    prestigeList: $("#prestigeList"),
    activeContractList: $("#activeContractList"),
    contractOfferList: $("#contractOfferList"),
    contractCapacity: $("#contractCapacity"),
    contractDock: $("#contractDock"),
    rerollContracts: $("#rerollContracts"),
    orderList: $("#orderList"),
    missionList: $("#missionList"),
    officeSummary: $("#officeSummary"),
    officeTabs: $$("[data-office-tab]"),
    officePanels: $$("[data-office-panel]"),
    evolutionTabs: $$("[data-evolution-tab]"),
    evolutionPanels: $$("[data-evolution-panel]"),
    contractTabCount: $("#contractTabCount"),
    orderTabCount: $("#orderTabCount"),
    missionTabCount: $("#missionTabCount"),
    farmStatusPanel: $("#farmStatusPanel"),
    farmMetrics: $("#farmMetrics"),
    toastZone: $("#toastZone"),
    saveBox: $("#saveBox"),
    coinsCounter: $("#coinsCounter"),
    researchCounter: $("#researchCounter"),
    prestigeCounter: $("#prestigeCounter"),
    farmLevelLabel: $("#farmLevelLabel"),
    farmXPBar: $("#farmXPBar"),
    farmXPText: $("#farmXPText"),
    stockNavBadge: $("#stockNavBadge"),
    officeNavBadge: $("#officeNavBadge"),
    ambientSetting: $("#ambientSetting"),
    reducedMotionSetting: $("#reducedMotionSetting"),
    compactCardsSetting: $("#compactCardsSetting"),
    uiScaleSetting: $("#uiScaleSetting"),
    uiScaleText: $("#uiScaleText")
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function percent(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
  }

  const resourceIcons = {
    coins: "img/icons/coin.png",
    research: "img/icons/potion.png",
    prestige: "img/icons/prestige.png"
  };

  function resourceAmount(type, value, options = {}) {
    const number = Number(value) || 0;
    const sign = options.sign === true ? (number > 0 ? "+" : number < 0 ? "−" : "") : "";
    const signHtml = sign ? `<span class="resource-sign ${number > 0 ? "positive" : "negative"}" aria-hidden="true">${sign}</span>` : "";
    const label = options.label ? `<small>${escapeHtml(options.label)}</small>` : "";
    const title = options.title ? ` title="${escapeHtml(options.title)}"` : "";
    return `<span class="resource-amount resource-${type}${options.compact ? " compact" : ""}"${title}><img src="${resourceIcons[type]}" alt="">${signHtml}<b>${engine.formatNumber(Math.abs(number))}</b>${label}</span>`;
  }

  function resourceRewards(reward, sign = true) {
    const parts = [];
    if (reward?.coins) parts.push(resourceAmount("coins", reward.coins, { sign, title: "Moedas" }));
    if (reward?.research) parts.push(resourceAmount("research", reward.research, { sign, title: "Pontos de pesquisa" }));
    if (reward?.prestige) parts.push(resourceAmount("prestige", reward.prestige, { sign, title: "Pontos de prestígio" }));
    return parts.join("");
  }

  function enrichResourceText(message) {
    let html = escapeHtml(message);
    const amount = '([+−-]?(?:\\d[\\d.,]*)(?:\\s(?:mil|mi|bi|tri|q))?)';
    const replace = (type, labelPattern) => {
      const expression = new RegExp(`${amount}\\s+(?:${labelPattern})`, "gi");
      html = html.replace(expression, (_, value) => {
        const first = value.trim().charAt(0);
        const signed = ["+", "−", "-"].includes(first);
        const sign = signed ? (first === "-" ? "−" : first) : "";
        const absolute = signed ? value.trim().slice(1) : value.trim();
        return `<span class="inline-resource resource-${type}"><img src="${resourceIcons[type]}" alt="">${sign ? `<span class="resource-sign ${sign === "+" ? "positive" : "negative"}">${sign}</span>` : ""}<b>${absolute}</b></span>`;
      });
    };
    replace("coins", "moedas?");
    replace("research", "(?:pontos? de )?pesquisa");
    replace("prestige", "(?:pontos? de )?prestígio");
    return html;
  }

  function toast(message, type = "") {
    if (!message) return;
    const item = document.createElement("div");
    item.className = `toast ${type}`.trim();
    item.innerHTML = `<span aria-hidden="true">${type === "error" ? "!" : type === "success" ? "✓" : "🍃"}</span><span>${enrichResourceText(message)}</span>`;
    dom.toastZone.appendChild(item);
    window.setTimeout(() => item.remove(), 3600);
  }

  function handleEngineEvent(event) {
    if (!event) return;
    if (event.type === "toast") toast(event.message);
    if (event.type === "level") {
      toast(`A fazenda alcançou o nível ${event.level} e recebeu +${engine.formatMoney(event.rewardCoins || 0)}. Novas sementes podem ter sido liberadas.`, "success");
      window.setTimeout(() => render(true), 0);
    }
    if (event.type === "offline") toast(`Enquanto você esteve longe, a fazenda produziu ${engine ? engine.formatNumber(event.harvested) : Math.floor(event.harvested)} itens.`);
    if (event.type === "contracts-expired-offline") toast(`${event.count} contrato${event.count === 1 ? " expirou" : "s expiraram"} enquanto você esteve longe. As unidades já entregues foram perdidas.`, "error");
  }

  engine = new GameEngine(event => {
    if (!engine) pendingEvents.push(event);
    else handleEngineEvent(event);
  });
  pendingEvents.splice(0).forEach(handleEngineEvent);

  function setupCategoryFilter() {
    const options = Object.entries(engine.data.categories)
      .map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`)
      .join("");
    dom.categoryFilter.insertAdjacentHTML("beforeend", options);
  }

  function showView(viewId, updateHash = true) {
    activeView = dom.views.some(view => view.id === viewId) ? viewId : "farmView";
    dom.views.forEach(view => view.classList.toggle("active", view.id === activeView));
    dom.tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.view === activeView));
    if (updateHash) history.replaceState(null, "", `#${activeView}`);
    render(true);
    window.scrollTo({ top: 0, behavior: engine.state.settings.reducedMotion ? "auto" : "smooth" });
  }

  function applySettings() {
    const settings = engine.state.settings;
    document.body.dataset.ambient = String(Boolean(settings.ambient));
    document.body.classList.toggle("reduce-motion", Boolean(settings.reducedMotion));
    document.body.classList.toggle("compact-cards", Boolean(settings.compactCards));
    document.documentElement.style.setProperty("--ui-scale", String((Number(settings.uiScale) || 100) / 100));

    if (document.activeElement !== dom.ambientSetting) dom.ambientSetting.checked = Boolean(settings.ambient);
    if (document.activeElement !== dom.reducedMotionSetting) dom.reducedMotionSetting.checked = Boolean(settings.reducedMotion);
    if (document.activeElement !== dom.compactCardsSetting) dom.compactCardsSetting.checked = Boolean(settings.compactCards);
    if (document.activeElement !== dom.uiScaleSetting) dom.uiScaleSetting.value = String(settings.uiScale || 100);
    dom.uiScaleText.textContent = `${settings.uiScale || 100}%`;
  }

  function renderHeader() {
    const state = engine.state;
    const farmNeed = engine.getFarmXPNeed();
    dom.coinsCounter.textContent = engine.formatNumber(state.coins);
    dom.researchCounter.textContent = engine.formatNumber(state.research);
    dom.prestigeCounter.textContent = engine.formatNumber(state.prestigePoints);
    dom.farmLevelLabel.textContent = state.farmLevel;
    dom.farmXPBar.style.width = `${percent((state.farmXP / farmNeed) * 100)}%`;
    dom.farmXPText.textContent = `${engine.formatNumber(state.farmXP)} / ${engine.formatNumber(farmNeed)} XP`;

    const metrics = engine.getMetrics();
    dom.stockNavBadge.textContent = engine.formatNumber(metrics.stock);
    const activeContracts = state.activeContracts.length;
    const readyOrders = engine.getReadyOrderCount();
    const readyMissions = engine.data.missions.filter(mission => !state.missionsClaimed[mission.id] && engine.missionValue(mission.metric, mission) >= mission.target).length;
    dom.officeNavBadge.textContent = String(activeContracts + readyOrders + readyMissions);
    dom.contractTabCount.textContent = String(activeContracts);
    dom.orderTabCount.textContent = String(readyOrders);
    dom.missionTabCount.textContent = String(readyMissions);
    renderContractDock();
  }

  function renderFarmStatus() {
    const metrics = engine.getMetrics();
    const capacity = Math.max(1, metrics.storageCapacity);
    const storagePct = percent((metrics.stock / capacity) * 100);

    if (metrics.owned === 0) {
      const starter = engine.getCrop("onion");
      const starterCost = engine.getBuyCost("onion");
      dom.farmStatusPanel.innerHTML = `
        <div class="farm-status-ring starter-ring" style="--status-progress:0%">
          <span>🌱</span>
          <strong>1º passo</strong>
        </div>
        <div class="farm-status-copy">
          <small>Comece por aqui</small>
          <h2>Compre sua primeira cultura</h2>
          <p>${escapeHtml(starter.name)} inicia a produção e custa ${resourceAmount("coins", -starterCost, { sign: true, compact: true })}.</p>
          <span class="farm-status-note">O saldo inicial foi equilibrado para permitir somente esta primeira compra.</span>
        </div>`;
      return;
    }

    dom.farmStatusPanel.innerHTML = `
      <div class="farm-status-ring" data-live-storage-ring style="--status-progress:${storagePct}%">
        <span>🧺</span>
        <strong data-live-storage-percent>${storagePct.toFixed(0)}%</strong>
      </div>
      <div class="farm-status-copy">
        <small>Resumo da produção</small>
        <h2>${metrics.storageRemaining > 0 ? "Celeiro em funcionamento" : "Celeiro cheio"}</h2>
        <p><b data-live-storage-used>${engine.formatNumber(metrics.stock)}</b> de ${engine.formatNumber(metrics.storageCapacity)} espaços ocupados.</p>
        <span class="farm-status-note" data-live-storage-note>${metrics.storageRemaining > 0 ? `${engine.formatNumber(metrics.storageRemaining)} espaços disponíveis` : "Venda ou amplie o estoque para retomar culturas pausadas"}</span>
      </div>`;
  }

  function renderFarmMetrics() {
    const metrics = engine.getMetrics();
    const productionPerMinute = engine.getOwnedCrops().reduce((sum, crop) => sum + engine.getProductionRate(crop.id), 0) * 60;
    dom.farmMetrics.innerHTML = `
      <span class="metric-chip">🌱 <strong>${metrics.owned}</strong> culturas</span>
      <span class="metric-chip">⚙️ <strong>${engine.formatNumber(productionPerMinute)}</strong>/min</span>
      <span class="metric-chip">🧺 <strong>${engine.formatNumber(metrics.stock)}</strong> / ${engine.formatNumber(metrics.storageCapacity)}</span>
      <span class="metric-chip">📑 <strong>${metrics.activeContracts}</strong> contratos ativos</span>`;
  }

  function formatLiveTime(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    if (value < 10) return `${value.toFixed(1).replace(".", ",")}s`;
    if (value < 60) return `${Math.ceil(value)}s`;
    return engine.formatTime(value);
  }

  function updateLiveHeader(now = performance.now()) {
    if (now - lastLiveHeader < 100) return;
    lastLiveHeader = now;
    const state = engine.state;
    const farmNeed = engine.getFarmXPNeed();
    dom.coinsCounter.textContent = engine.formatNumber(state.coins);
    dom.researchCounter.textContent = engine.formatNumber(state.research);
    dom.prestigeCounter.textContent = engine.formatNumber(state.prestigePoints);
    dom.farmLevelLabel.textContent = state.farmLevel;
    dom.farmXPBar.style.width = `${percent((state.farmXP / farmNeed) * 100)}%`;
    dom.farmXPText.textContent = `${engine.formatNumber(state.farmXP)} / ${engine.formatNumber(farmNeed)} XP`;
    dom.stockNavBadge.textContent = engine.formatNumber(engine.getStorageUsed());
  }

  function updateLiveFarmUI(now = performance.now()) {
    if (activeView !== "farmView") return;
    const storageRemaining = engine.getStorageRemaining();
    const updateControls = now - lastCropControls >= 450;
    if (updateControls) lastCropControls = now;

    $$('[data-live-crop]').forEach(card => {
      const cropId = card.dataset.liveCrop;
      const cropState = engine.state.crops[cropId];
      if (!cropState?.owned) return;
      const growthTime = engine.getGrowthTime(cropId);
      const instant = growthTime <= 0;
      const activeContracts = engine.state.activeContracts.filter(contract => contract.cropId === cropId && contract.delivered < contract.amount && contract.timeRemaining > 0);
      const directRoute = cropState.autoSell || activeContracts.length > 0;
      const paused = storageRemaining <= 0 && !directRoute;
      const progress = instant ? 100 : percent(cropState.progress * 100);
      const ring = $('[data-crop-ring]', card);
      const progressLabel = $('[data-crop-percent]', card);
      const cycle = $('[data-crop-cycle]', card);
      const stock = $('[data-crop-stock]', card);
      const route = $('[data-crop-route]', card);

      if (ring) {
        ring.style.setProperty("--growth-progress", `${progress}%`);
        ring.classList.toggle("instant", instant);
        ring.classList.toggle("paused", paused);
      }
      if (progressLabel) progressLabel.textContent = instant ? "∞" : paused ? "Ⅱ" : `${Math.floor(progress)}%`;
      if (cycle) cycle.textContent = instant ? "Contínua" : paused ? "Pausada" : formatLiveTime((1 - cropState.progress) * growthTime);
      if (stock) stock.textContent = engine.formatNumber(cropState.stock);
      if (route) {
        const kind = activeContracts.length ? "contract" : cropState.autoSell ? "auto" : "stock";
        route.className = `crop-route-pill route-${kind}`;
        route.textContent = activeContracts.length ? `Contrato${activeContracts.length > 1 ? ` ×${activeContracts.length}` : ""}` : cropState.autoSell ? "Venda auto" : "Estoque";
      }
      card.classList.toggle("auto-sell-enabled", Boolean(cropState.autoSell));

      if (updateControls) {
        const maxed = cropState.level >= GameEngine.MAX_CROP_LEVEL;
        const affordable = engine.getCropAffordableUpgrades(cropId);
        const nextCost = affordable.nextCost;
        const affordability = $('[data-crop-affordability]', card);
        const oneButton = $('[data-crop-upgrade-one]', card);
        const maxButton = $('[data-crop-upgrade-max]', card);
        const sellButton = $('[data-crop-sell]', card);
        if (affordability) {
          affordability.innerHTML = maxed
            ? "Nível máximo"
            : affordable.levels > 0
              ? `+${affordable.levels} por ${resourceAmount("coins", -affordable.totalCost, { sign: true, compact: true })}`
              : `Próximo ${resourceAmount("coins", -nextCost, { sign: true, compact: true })}`;
        }
        if (oneButton) oneButton.disabled = maxed || engine.state.coins < nextCost;
        if (maxButton) {
          maxButton.disabled = maxed || affordable.levels < 1;
          maxButton.textContent = maxed ? "Máximo" : `Máx. +${affordable.levels}`;
        }
        if (sellButton) {
          sellButton.disabled = cropState.stock <= 0;
          sellButton.textContent = `Vender estoque${cropState.stock > 0 ? ` · ${engine.formatNumber(cropState.stock)}` : ""}`;
        }
      }
    });

    if (updateControls) {
      $$('[data-locked-crop]').forEach(card => {
        const cropId = card.dataset.lockedCrop;
        const crop = engine.getCrop(cropId);
        const unlocked = engine.isCropUnlocked(cropId);
        const buyCost = engine.getBuyCost(cropId);
        const canAfford = engine.state.coins >= buyCost;
        const status = $('[data-crop-purchase-status]', card);
        const button = $('[data-crop-purchase]', card);
        card.classList.toggle("insufficient", unlocked && !canAfford);
        if (status) status.textContent = !unlocked ? `Libera no nível ${crop.unlockLevel}` : canAfford ? "Disponível para compra" : "Saldo insuficiente";
        if (button) {
          button.disabled = !unlocked || !canAfford;
          button.innerHTML = !unlocked
            ? `Nível ${crop.unlockLevel} necessário`
            : canAfford
              ? `Comprar ${resourceAmount("coins", -buyCost, { sign: true, compact: true })}`
              : `Faltam ${resourceAmount("coins", buyCost - engine.state.coins, { compact: true })}`;
        }
      });
    }

    const metrics = engine.getMetrics();
    const capacity = Math.max(1, metrics.storageCapacity);
    const storagePct = percent((metrics.stock / capacity) * 100);
    const storageRing = $('[data-live-storage-ring]');
    const storagePercent = $('[data-live-storage-percent]');
    const storageUsed = $('[data-live-storage-used]');
    const storageNote = $('[data-live-storage-note]');
    if (storageRing) storageRing.style.setProperty("--status-progress", `${storagePct}%`);
    if (storagePercent) storagePercent.textContent = `${Math.floor(storagePct)}%`;
    if (storageUsed) storageUsed.textContent = engine.formatNumber(metrics.stock);
    if (storageNote) storageNote.textContent = metrics.storageRemaining > 0 ? `${engine.formatNumber(metrics.storageRemaining)} espaços disponíveis` : "Venda ou amplie o estoque para retomar culturas pausadas";
  }

  function getCropGlow(category) {
    const colors = {
      leaf: "rgba(131, 187, 101, .20)",
      root: "rgba(204, 145, 87, .18)",
      fruit: "rgba(222, 119, 101, .16)",
      tree: "rgba(147, 183, 95, .18)",
      grain: "rgba(225, 187, 88, .20)",
      tropical: "rgba(230, 153, 87, .18)",
      bush: "rgba(164, 113, 177, .15)",
      industry: "rgba(102, 162, 159, .17)"
    };
    return colors[category] || "rgba(151, 195, 126, .18)";
  }

  function renderCropCard(crop) {
    const data = engine.state.crops[crop.id];
    const category = engine.data.categories[crop.category];
    const unlocked = engine.isCropUnlocked(crop.id);
    const buyCost = engine.getBuyCost(crop.id);
    const canAffordPurchase = engine.state.coins >= buyCost;

    if (!data.owned) {
      const purchaseLabel = !unlocked
        ? `Nível ${crop.unlockLevel} necessário`
        : canAffordPurchase
          ? `Comprar ${resourceAmount("coins", -buyCost, { sign: true, compact: true })}`
          : `Faltam ${resourceAmount("coins", buyCost - engine.state.coins, { compact: true })}`;
      return `
        <article class="crop-card locked ${unlocked && !canAffordPurchase ? "insufficient" : ""}" data-locked-crop="${crop.id}" style="--crop-glow:${getCropGlow(crop.category)}">
          <div class="crop-level-strip locked-level-strip">
            <span data-crop-purchase-status>${!unlocked ? `Libera no nível ${crop.unlockLevel}` : canAffordPurchase ? "Disponível para compra" : "Saldo insuficiente"}</span>
          </div>
          <div class="crop-head">
            <div class="crop-art locked-art"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"></div>
            <div class="crop-info">
              <div class="crop-title-row"><h3>${escapeHtml(crop.name)}</h3></div>
              <div class="crop-meta-row">
                <span class="crop-category">${escapeHtml(category)}</span>
                ${resourceAmount("coins", buyCost, { compact: true, title: "Preço da cultura" })}
              </div>
              <small class="locked-cycle">Ciclo inicial: ${crop.baseGrowth}s</small>
            </div>
          </div>
          <button class="button primary full crop-buy-button" type="button" data-action="buy-crop" data-crop="${crop.id}" data-crop-purchase ${unlocked && canAffordPurchase ? "" : "disabled"}>
            ${purchaseLabel}
          </button>
        </article>`;
    }

    const growthTime = engine.getGrowthTime(crop.id);
    const instant = growthTime <= 0;
    const growthPct = instant ? 100 : percent(data.progress * 100);
    const price = engine.getSalePrice(crop.id);
    const activeContracts = engine.state.activeContracts.filter(contract => contract.cropId === crop.id && contract.delivered < contract.amount);
    const directRoute = data.autoSell || activeContracts.length > 0;
    const storageFull = engine.getStorageRemaining() <= 0 && !directRoute;
    const maxed = data.level >= GameEngine.MAX_CROP_LEVEL;
    const speedMaxed = data.level >= GameEngine.INSTANT_GROWTH_LEVEL;
    const affordable = engine.getCropAffordableUpgrades(crop.id);
    const nextCost = affordable.nextCost;
    const routeKind = activeContracts.length ? "contract" : data.autoSell ? "auto" : "stock";
    const routeLabel = activeContracts.length ? `Contrato${activeContracts.length > 1 ? ` ×${activeContracts.length}` : ""}` : data.autoSell ? "Venda auto" : "Estoque";
    const affordability = maxed
      ? "Nível máximo"
      : affordable.levels > 0
        ? `+${affordable.levels} por ${resourceAmount("coins", -affordable.totalCost, { sign: true, compact: true })}`
        : `Próximo ${resourceAmount("coins", -nextCost, { sign: true, compact: true })}`;
    const cycleLabel = instant ? "Contínua" : storageFull ? "Pausada" : formatLiveTime((1 - data.progress) * growthTime);

    return `
      <article class="crop-card ${data.autoSell ? "auto-sell-enabled" : ""}" data-live-crop="${crop.id}" style="--crop-glow:${getCropGlow(crop.category)}">
        <div class="crop-level-strip" ${speedMaxed ? 'title="Velocidade máxima; níveis 251–300 aprimoram o rendimento desta cultura"' : ""}>
          <span class="crop-level-compact">Nível <strong>${data.level}</strong><small>/ ${GameEngine.MAX_CROP_LEVEL}</small></span>
          <span class="crop-route-pill route-${routeKind}" data-crop-route>${routeLabel}</span>
        </div>
        <div class="crop-head">
          <div class="crop-art-progress ${storageFull ? "paused" : ""} ${instant ? "instant" : ""}" data-crop-ring style="--growth-progress:${growthPct}%" title="Progresso da produção">
            <div class="crop-art"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"></div>
            <span class="crop-progress-percent" data-crop-percent>${instant ? "∞" : storageFull ? "Ⅱ" : `${Math.floor(growthPct)}%`}</span>
          </div>
          <div class="crop-info">
            <div class="crop-title-row"><h3>${escapeHtml(crop.name)}</h3>${speedMaxed ? '<span class="instant-mini" title="Velocidade máxima">∞</span>' : ""}</div>
            <div class="crop-meta-row">
              <span class="crop-category">${escapeHtml(category)}</span>
              ${resourceAmount("coins", price, { compact: true, title: "Valor por unidade" })}
            </div>
            <div class="crop-quick-stats">
              <span title="Tempo restante"><i>◷</i><b data-crop-cycle>${cycleLabel}</b></span>
              <span title="Estoque desta cultura"><i>🧺</i><b data-crop-stock>${engine.formatNumber(data.stock)}</b></span>
            </div>
          </div>
        </div>
        <div class="crop-upgrade-panel compact-upgrade-panel">
          <div class="crop-upgrade-copy"><small>Aprimoramento</small><strong data-crop-affordability>${affordability}</strong></div>
          <div class="crop-upgrade-actions">
            <button class="button soft compact-button" type="button" data-action="upgrade-crop-once" data-crop="${crop.id}" data-crop-upgrade-one ${maxed || engine.state.coins < nextCost ? "disabled" : ""} title="${maxed ? "Nível máximo" : `Custo: ${engine.formatMoney(nextCost)}`}">+1</button>
            <button class="button primary compact-button" type="button" data-action="upgrade-crop-max" data-crop="${crop.id}" data-crop-upgrade-max ${maxed || affordable.levels < 1 ? "disabled" : ""}>${maxed ? "Máximo" : `Máx. +${affordable.levels}`}</button>
          </div>
        </div>
        <button class="crop-sell-button" type="button" data-action="sell-crop" data-crop="${crop.id}" data-crop-sell ${data.stock <= 0 ? "disabled" : ""}>Vender estoque${data.stock > 0 ? ` · ${engine.formatNumber(data.stock)}` : ""}</button>
      </article>`;
  }

  function renderCrops() {
    const term = normalize(dom.searchCrop.value);
    const category = dom.categoryFilter.value;
    const visibleUnlockLevel = engine.state.farmLevel + 1;
    const list = engine.data.crops.filter(crop => {
      const categoryName = engine.data.categories[crop.category];
      const visibleByProgress = engine.state.crops[crop.id].owned || crop.unlockLevel <= visibleUnlockLevel;
      return visibleByProgress && (category === "all" || crop.category === category) && (!term || normalize(`${crop.name} ${categoryName}`).includes(term));
    }).sort((a, b) => a.index - b.index);

    dom.cropGrid.innerHTML = list.map(renderCropCard).join("");
    dom.cropEmpty.classList.toggle("hidden", list.length > 0);
  }

  function renderStock() {
    const owned = engine.data.crops.filter(crop => engine.state.crops[crop.id].owned);
    const metrics = engine.getMetrics();
    const totalCapacity = engine.getStorageCap();
    const storageUsed = engine.getStorageUsed();
    const storageAvailable = engine.getStorageRemaining();
    const storagePct = percent((storageUsed / totalCapacity) * 100);
    const totalValue = owned.reduce((sum, crop) => sum + engine.state.crops[crop.id].stock * engine.getSalePrice(crop.id), 0);
    const autoSellCount = owned.filter(crop => engine.state.crops[crop.id].autoSell).length;
    const warehouse = engine.data.upgrades.find(item => item.id === "warehouse");
    const warehouseLevel = Number(engine.state.upgrades.warehouse || 0);
    const warehouseMaxed = warehouseLevel >= warehouse.max;
    const warehouseCost = warehouseMaxed ? 0 : engine.getUpgradeCost(warehouse, engine.state.upgrades);
    dom.stockSummary.innerHTML = `
      <article class="summary-card storage-capacity-card">
        <div class="storage-summary-head"><span><small>Estoque compartilhado</small><strong>${engine.formatNumber(storageUsed)} / ${engine.formatNumber(totalCapacity)}</strong></span><b>${storagePct.toFixed(0)}%</b></div>
        <div class="progress-track growth"><span style="width:${Math.min(100, storagePct)}%"></span></div>
        <button class="button soft compact-button full" type="button" data-action="buy-upgrade" data-id="warehouse" ${warehouseMaxed || engine.state.coins < warehouseCost ? "disabled" : ""}>${warehouseMaxed ? "Capacidade máxima" : `Aumentar +100 · ${resourceAmount("coins", -warehouseCost, { sign: true, compact: true })}`}</button>
      </article>
      <article class="summary-card"><small>Espaço disponível</small><strong>${engine.formatNumber(storageAvailable)}</strong></article>
      <article class="summary-card"><small>Venda automática</small><strong>${autoSellCount} cultura${autoSellCount === 1 ? "" : "s"}</strong></article>
      <article class="summary-card"><small>Valor estimado</small><strong>${resourceAmount("coins", totalValue)}</strong></article>
      <article class="summary-card"><small>Total vendido</small><strong>${engine.formatNumber(metrics.sold)}</strong></article>`;

    if (!owned.length) {
      dom.stockGrid.innerHTML = `<div class="empty-state">Compre sua primeira cultura para começar a encher o celeiro.</div>`;
      return;
    }

    dom.stockGrid.innerHTML = owned.map(crop => {
      const data = engine.state.crops[crop.id];
      const price = engine.getSalePrice(crop.id);
      const share = storageUsed > 0 ? percent((data.stock / storageUsed) * 100) : 0;
      const activeContracts = engine.state.activeContracts.filter(contract => contract.cropId === crop.id && contract.delivered < contract.amount).length;
      return `
        <article class="stock-card ${data.autoSell ? "auto-sell-card" : ""}">
          <div class="stock-head">
            <div class="stock-ident">
              <img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy">
              <div><h3>${escapeHtml(crop.name)}</h3><small>${escapeHtml(engine.data.categories[crop.category])}</small></div>
            </div>
            ${resourceAmount("coins", price, { compact: true, title: "Valor por unidade" })}
          </div>
          <button class="auto-sell-toggle ${data.autoSell ? "active" : ""}" type="button" data-action="toggle-auto-sell" data-crop="${crop.id}" aria-pressed="${String(data.autoSell)}">
            <span class="auto-sell-switch"><i></i></span>
            <span><strong>Venda automática</strong><small>${data.autoSell ? "Ativa: novas unidades não entram no estoque" : "Desativada: novas unidades são armazenadas"}</small></span>
          </button>
          ${activeContracts ? `<div class="stock-contract-priority"><span>📑</span><p><strong>${activeContracts} contrato${activeContracts === 1 ? " ativo" : "s ativos"}</strong><small>A produção será enviada aos contratos antes da venda automática.</small></p></div>` : ""}
          <div class="stock-amount">
            <strong>${engine.formatNumber(data.stock)} unidades</strong>
            <small>${share.toFixed(0)}% do conteúdo atual do celeiro · ${resourceAmount("coins", price, { compact: true })} por unidade</small>
          </div>
          <div class="stock-actions">
            <button class="button secondary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="0.25" ${data.stock <= 0 ? "disabled" : ""}>Vender 25%</button>
            <button class="button secondary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="0.5" ${data.stock <= 0 ? "disabled" : ""}>Vender 50%</button>
            <button class="button primary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="1" ${data.stock <= 0 ? "disabled" : ""}>Vender tudo</button>
          </div>
        </article>`;
    }).join("");
  }

  function renderUpgradeCard(item, kind) {
    const source = kind === "upgrade" ? engine.state.upgrades : kind === "research" ? engine.state.researchTechs : engine.state.prestigeUpgrades;
    const level = Number(source[item.id] || 0);
    const maxed = level >= item.max;
    const cost = maxed ? 0 : engine.getUpgradeCost(item, source);
    const resourceType = kind === "upgrade" ? "coins" : kind === "research" ? "research" : "prestige";
    const action = kind === "upgrade" ? "buy-upgrade" : kind === "research" ? "buy-research" : "buy-prestige-upgrade";
    return `
      <article class="upgrade-card">
        <div class="upgrade-head"><div><h3>${escapeHtml(item.name)}</h3><span class="crop-category">Nível ${level} / ${item.max}</span></div><span class="upgrade-icon" aria-hidden="true">${item.icon}</span></div>
        <p>${enrichResourceText(item.desc)}</p>
        <div class="upgrade-level-row"><span>Próximo nível</span><strong>${maxed ? "Máximo" : resourceAmount(resourceType, -cost, { sign: true })}</strong></div>
        <button class="button ${kind === "prestige" ? "gold" : "primary"} full" type="button" data-action="${action}" data-id="${item.id}" ${maxed ? "disabled" : ""}>${maxed ? "Concluído" : `Aprimorar ${resourceAmount(resourceType, -cost, { sign: true, compact: true })}`}</button>
      </article>`;
  }

  function showEvolutionTab(tabId) {
    activeEvolutionTab = ["upgrades", "research", "prestige"].includes(tabId) ? tabId : "upgrades";
    dom.evolutionTabs.forEach(tab => {
      const active = tab.dataset.evolutionTab === activeEvolutionTab;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    dom.evolutionPanels.forEach(panel => {
      const active = panel.dataset.evolutionPanel === activeEvolutionTab;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  }

  function renderEvolutions() {
    dom.upgradeList.innerHTML = engine.data.upgrades.map(item => renderUpgradeCard(item, "upgrade")).join("");
    dom.researchList.innerHTML = engine.data.research.map(item => renderUpgradeCard(item, "research")).join("");
    dom.prestigeList.innerHTML = engine.data.prestigeUpgrades.map(item => renderUpgradeCard(item, "prestige")).join("");

    const gain = engine.getPrestigeEstimate();
    const metrics = engine.getMetrics();
    dom.prestigeDashboard.innerHTML = `
      <div class="prestige-copy">
        <p class="eyebrow">renascimento e legado</p>
        <h2>Comece um novo capítulo da sua história</h2>
        <p>Prestigiar reinicia moedas, culturas, níveis das plantações, infraestrutura e pesquisa. Pontos de prestígio, legados, missões concluídas e totais históricos permanecem.</p>
      </div>
      <div class="prestige-side">
        <div class="prestige-stat-row">
          <div class="prestige-stat"><small>Ganho agora</small><strong>${resourceAmount("prestige", gain, { sign: true })}</strong></div>
          <div class="prestige-stat"><small>Prestígios feitos</small><strong>${engine.state.stats.prestiges}</strong></div>
          <div class="prestige-stat"><small>Bônus de missão</small><strong>${engine.state.permanentBonuses.prestigeDouble ? "2× pontos" : "Ainda bloqueado"}</strong></div>
          <div class="prestige-stat"><small>Culturas</small><strong>${metrics.owned}</strong></div>
          <div class="prestige-stat"><small>Moedas nesta jornada</small><strong>${resourceAmount("coins", engine.state.stats.runCoinsEarned)}</strong></div>
        </div>
        <button class="button gold full" type="button" data-action="perform-prestige" ${gain < 1 ? "disabled" : ""}>Prestigiar e receber ${resourceAmount("prestige", gain, { sign: true, compact: true })}</button>
      </div>`;
    showEvolutionTab(activeEvolutionTab);
  }

  function renderOfficeSummary() {
    const owned = engine.getOwnedCrops().length;
    const completeOrderSeries = engine.getOwnedCrops().filter(crop => engine.getOrder(crop.id)?.complete).length;
    dom.officeSummary.innerHTML = `
      <article class="office-summary-card"><span>🤝</span><div><small>Contratos ativos</small><strong>${engine.state.activeContracts.length} / 2</strong></div></article>
      <article class="office-summary-card"><span>📑</span><div><small>Contratos concluídos</small><strong>${engine.formatNumber(engine.state.stats.lifetimeContractsCompleted)}</strong></div></article>
      <article class="office-summary-card"><span>🧾</span><div><small>Pedidos concluídos</small><strong>${engine.formatNumber(engine.state.stats.lifetimeOrdersCompleted)}</strong></div></article>
      <article class="office-summary-card"><span>✅</span><div><small>Séries finalizadas</small><strong>${completeOrderSeries} / ${owned}</strong></div></article>`;
  }

  function showOfficeTab(tabId) {
    activeOfficeTab = ["contracts", "orders", "missions"].includes(tabId) ? tabId : "contracts";
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

  function renderContractDock() {
    const contracts = engine.state.activeContracts || [];
    if (!contracts.length) {
      dom.contractDock.classList.remove("visible");
      dom.contractDock.innerHTML = "";
      return;
    }
    dom.contractDock.classList.add("visible");
    dom.contractDock.innerHTML = `
      <button class="contract-dock-title" type="button" data-go-office-contracts><span>📌</span><strong>Contratos ativos</strong><small>${contracts.length}/2</small></button>
      <div class="contract-dock-list">
        ${contracts.map(contract => {
          const crop = engine.getCrop(contract.cropId);
          const company = engine.getCompany(contract.companyId);
          const progress = engine.getContractProgress(contract);
          const urgent = contract.timeRemaining <= 30;
          return `<button class="contract-dock-item ${urgent ? "deadline-warning" : ""}" type="button" data-go-office-contracts title="Abrir contratos">
            <img src="${crop.image}" alt="${escapeHtml(crop.name)}">
            <span><small>${escapeHtml(company.name)}</small><strong>${escapeHtml(crop.name)}</strong><i><b class="delivered" style="width:${percent(progress.percent)}%"></b><b class="available" style="width:${percent(progress.availablePercent)}%"></b></i><u>${engine.formatTime(contract.timeRemaining)} restantes</u></span>
            <em class="${progress.readyToComplete ? "ready" : ""}">${Math.floor(progress.availablePercent)}%<small>${progress.readyToComplete ? "Pronto" : "coberto"}</small></em>
          </button>`;
        }).join("")}
      </div>`;
  }

  function renderContracts() {
    const owned = engine.getOwnedCrops();
    dom.rerollContracts.disabled = !owned.length;
    dom.rerollContracts.innerHTML = owned.length
      ? `Renovar propostas ${resourceAmount("coins", -engine.getContractRerollCost(), { sign: true, compact: true })}`
      : "Renovar propostas";
    if (!owned.length) {
      dom.contractCapacity.innerHTML = "";
      dom.activeContractList.innerHTML = `<div class="empty-state office-empty">Compre sua primeira cultura para começar a receber propostas de empresas.</div>`;
      dom.contractOfferList.innerHTML = "";
      return;
    }

    const active = engine.state.activeContracts;
    const offers = engine.state.contractOffers;
    const openSlots = Math.max(0, 2 - active.length);
    dom.contractCapacity.innerHTML = `
      <div><span class="contract-capacity-icon">🤝</span><div><small>Capacidade de negociação</small><strong>${active.length} de 2 contratos ativos</strong></div></div>
      <div class="contract-slot-pills"><span class="${active.length >= 1 ? "filled" : ""}">${active.length >= 1 ? "Ocupado" : "Livre"}</span><span class="${active.length >= 2 ? "filled" : ""}">${active.length >= 2 ? "Ocupado" : "Livre"}</span></div>`;

    dom.activeContractList.innerHTML = active.length ? active.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const difficulty = engine.getContractDifficulty(contract.difficulty);
      const progress = engine.getContractProgress(contract);
      const stock = Number(engine.state.crops[contract.cropId]?.stock || 0);
      const deliverNow = progress.availableNow;
      const urgent = contract.timeRemaining <= 30;
      return `
        <article class="contract-card active-contract-card ${urgent ? "contract-deadline-warning" : ""}">
          <div class="company-ribbon"><span>${company.icon}</span><div><small>Contrato com</small><strong>${escapeHtml(company.name)}</strong></div><em>${escapeHtml(company.specialty)}</em></div>
          <div class="contract-head">
            <div class="contract-crop"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Produto contratado</small><h3>${escapeHtml(crop.name)}</h3></div></div>
            <span class="status-tag active-tag">Ativo</span>
          </div>
          <div class="contract-time-panel ${urgent ? "urgent" : ""}"><span>⏱️ <strong>${escapeHtml(difficulty.label)}</strong></span><b>${engine.formatTime(contract.timeRemaining)}</b></div>
          <div class="contract-progress-block">
            <div class="progress-label"><span>Já entregue</span><strong>${engine.formatNumber(progress.delivered)} / ${engine.formatNumber(contract.amount)} · ${Math.floor(progress.percent)}%</strong></div>
            <div class="progress-track contract-progress-track"><span class="contract-delivered" style="width:${percent(progress.percent)}%"></span><span class="contract-available" style="width:${percent(progress.availablePercent)}%"></span></div>
            <div class="contract-readiness ${progress.readyToComplete ? "ready" : ""}"><span>${progress.readyToComplete ? "✓ O estoque já conclui este contrato" : "Cobertura considerando o estoque"}</span><strong>${Math.floor(progress.availablePercent)}%</strong></div>
          </div>
          <div class="contract-routing-note"><span>↪</span><p><strong>Prioridade automática</strong><small>Enquanto este contrato estiver ativo, novas unidades de ${escapeHtml(crop.name.toLowerCase())} irão diretamente para ele.</small></p></div>
          <div class="contract-lines">
            <div class="contract-line"><span>Disponível no estoque</span><strong>${engine.formatNumber(stock)}</strong></div>
            <div class="contract-line"><span>Pagamento ao concluir</span><strong>${resourceAmount("coins", contract.rewardCoins, { sign: true })}</strong></div>
            <div class="contract-line"><span>Pesquisa adicional</span><strong>${contract.rewardResearch ? resourceAmount("research", contract.rewardResearch, { sign: true }) : "Sem bônus"}</strong></div>
          </div>
          <button class="button primary full" type="button" data-action="deliver-contract" data-id="${contract.id}" ${deliverNow < 1 ? "disabled" : ""}>${deliverNow > 0 ? `Entregar ${engine.formatNumber(deliverNow)} do estoque${deliverNow === progress.remaining ? " e concluir" : ""}` : `Produção direcionada automaticamente`}</button>
          <small class="contract-loss-warning">Se o prazo terminar, tudo que já foi entregue será perdido e não haverá pagamento.</small>
        </article>`;
    }).join("") : `<div class="empty-state office-empty compact-empty">Nenhum contrato ativo. Escolha até duas propostas abaixo quando estiver pronto.</div>`;

    dom.contractOfferList.innerHTML = offers.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const difficulty = engine.getContractDifficulty(contract.difficulty);
      return `
        <article class="contract-card contract-offer-card">
          <div class="company-ribbon offer-ribbon"><span>${company.icon}</span><div><small>Proposta de</small><strong>${escapeHtml(company.name)}</strong></div><em>${escapeHtml(company.specialty)}</em></div>
          <div class="contract-head">
            <div class="contract-crop"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Solicitação empresarial</small><h3>${engine.formatNumber(contract.amount)} unidades de ${escapeHtml(crop.name.toLowerCase())}</h3></div></div>
            <span class="status-tag proposal-tag">Proposta</span>
          </div>
          <div class="contract-offer-meta"><span>⏱️ ${escapeHtml(difficulty.label)}</span><strong>${engine.formatTime(contract.durationSeconds)} após aceitar</strong></div>
          <p>Ao aceitar, a produção desta cultura passa a abastecer o contrato antes do estoque e da venda automática.</p>
          <div class="contract-lines">
            <div class="contract-line"><span>Pagamento total</span><strong>${resourceAmount("coins", contract.rewardCoins, { sign: true })}</strong></div>
            <div class="contract-line"><span>Pesquisa adicional</span><strong>${contract.rewardResearch ? resourceAmount("research", contract.rewardResearch, { sign: true }) : "Sem bônus"}</strong></div>
          </div>
          <div class="contract-offer-actions">
            <button class="button secondary" type="button" data-action="decline-contract" data-id="${contract.id}">Recusar</button>
            <button class="button primary" type="button" data-action="accept-contract" data-id="${contract.id}" ${openSlots < 1 ? "disabled" : ""}>${openSlots < 1 ? "Limite atingido" : "Aceitar contrato"}</button>
          </div>
        </article>`;
    }).join("");
  }

  function renderOrders() {
    const owned = engine.getOwnedCrops();
    if (!owned.length) {
      dom.orderList.innerHTML = `<div class="empty-state office-empty">Cada cultura comprada libera automaticamente sua própria sequência de pedidos.</div>`;
      return;
    }

    dom.orderList.innerHTML = owned.map(crop => {
      const order = engine.getOrder(crop.id);
      const stock = engine.state.crops[crop.id].stock;
      if (order.complete) {
        return `
          <article class="order-card order-complete">
            <div class="order-head">
              <div class="contract-crop"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Série completa</small><h3>${escapeHtml(crop.name)}</h3></div></div>
              <span class="status-tag">${order.totalTiers}/${order.totalTiers}</span>
            </div>
            <div class="order-finished-mark">✓</div>
            <p>Todos os pedidos desta cultura foram atendidos. A produção continua disponível para vendas e contratos.</p>
          </article>`;
      }

      const progress = percent((order.delivered / order.amount) * 100);
      const deliverNow = Math.min(stock, order.remaining);
      return `
        <article class="order-card">
          <div class="order-head">
            <div class="contract-crop"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Pedido ${order.tier + 1} de ${order.totalTiers}</small><h3>${escapeHtml(crop.name)}</h3></div></div>
            <span class="status-tag permanent-tag">Sem prazo</span>
          </div>
          <p>Entregue ${engine.formatNumber(order.amount)} unidades. Você pode completar este pedido em várias remessas.</p>
          <div class="order-progress">
            <div class="progress-label"><span>Entregue</span><strong>${engine.formatNumber(order.delivered)} / ${engine.formatNumber(order.amount)}</strong></div>
            <div class="progress-track growth"><span style="width:${progress}%"></span></div>
          </div>
          <div class="contract-lines">
            <div class="contract-line"><span>No estoque agora</span><strong>${engine.formatNumber(stock)}</strong></div>
            <div class="contract-line"><span>Recompensa final</span><strong class="resource-reward-group">${resourceRewards({ coins: order.rewardCoins, research: order.rewardResearch })}</strong></div>
          </div>
          <button class="button primary full" type="button" data-action="deliver-order" data-crop="${crop.id}" ${deliverNow < 1 ? "disabled" : ""}>${deliverNow > 0 ? `Entregar ${engine.formatNumber(deliverNow)} disponível${deliverNow === order.remaining ? " e concluir" : ""}` : `Faltam ${engine.formatNumber(order.remaining)}`}</button>
        </article>`;
    }).join("");
  }

  function rewardHtml(reward) {
    const parts = [];
    const resources = resourceRewards(reward);
    if (resources) parts.push(resources);
    if (reward.permanent === "prestigeDouble") parts.push('<span class="permanent-reward">2× pontos nos próximos prestígios</span>');
    return parts.join('<span class="resource-plus">+</span>');
  }

  function renderMissions() {
    dom.missionList.innerHTML = engine.data.missions.map(mission => {
      const value = engine.missionValue(mission.metric, mission);
      const completed = value >= mission.target;
      const claimed = Boolean(engine.state.missionsClaimed[mission.id]);
      const progress = percent((value / mission.target) * 100);
      return `
        <article class="mission-card ${claimed ? "claimed" : ""}">
          <div class="mission-head">
            <div><h3>${escapeHtml(mission.title)}</h3><p>${escapeHtml(mission.desc)}</p></div>
            <span class="status-tag">${claimed ? "Concluída" : completed ? "Pronta" : "Em andamento"}</span>
          </div>
          <div class="mission-progress">
            <div class="progress-label"><span>Progresso</span><strong>${engine.formatNumber(Math.min(value, mission.target))} / ${engine.formatNumber(mission.target)}</strong></div>
            <div class="progress-track growth"><span style="width:${progress}%"></span></div>
          </div>
          <div class="mission-reward"><span>Recompensa</span><strong class="resource-reward-group">${rewardHtml(mission.reward)}</strong></div>
          <button class="button ${completed && !claimed ? "primary" : "secondary"} full" type="button" data-action="claim-mission" data-id="${mission.id}" ${completed && !claimed ? "" : "disabled"}>${claimed ? "Recompensa recebida" : completed ? "Receber recompensa" : "Continue cultivando"}</button>
        </article>`;
    }).join("");
  }

  function render(force = false) {
    const now = performance.now();
    if (!force && now - lastRender < 1800) return;
    lastRender = now;
    renderHeader();
    applySettings();

    if (activeView === "farmView") {
      renderFarmStatus();
      renderFarmMetrics();
      if (force || !dom.cropGrid.children.length) renderCrops();
    } else if (activeView === "stockView") {
      renderStock();
    } else if (activeView === "evolveView") {
      renderEvolutions();
    } else if (activeView === "officeView") {
      renderOfficeSummary();
      renderContracts();
      renderOrders();
      renderMissions();
      showOfficeTab(activeOfficeTab);
    }
    updateLiveHeader(now);
    updateLiveFarmUI();
  }

  function act(result, successMessage = "") {
    if (!result?.ok) {
      if (result?.message) toast(result.message, "error");
      return false;
    }
    if (successMessage) toast(typeof successMessage === "function" ? successMessage(result) : successMessage, "success");
    render(true);
    return true;
  }

  function handleAction(button) {
    const action = button.dataset.action;
    const cropId = button.dataset.crop;
    const id = button.dataset.id;

    if (action === "buy-crop") act(engine.buyCrop(cropId));
    if (action === "upgrade-crop-once") act(engine.upgradeCrop(cropId, 1), result => `${result.crop.name} aprimorada para o nível ${result.level}.`);
    if (action === "upgrade-crop-max") act(engine.upgradeCropMax(cropId), result => `${result.crop.name} avançou ${result.purchased} nível${result.purchased === 1 ? "" : "is"} e chegou ao nível ${result.level}.`);
    if (action === "sell-crop") {
      const stock = engine.state.crops[cropId]?.stock || 0;
      act(engine.sellCrop(cropId, stock), result => `Venda concluída: +${engine.formatMoney(result.gain)}.`);
    }
    if (action === "sell-fraction") {
      const stock = engine.state.crops[cropId]?.stock || 0;
      const amount = Math.max(1, Math.floor(stock * Number(button.dataset.fraction || 1)));
      act(engine.sellCrop(cropId, amount), result => `${engine.formatNumber(result.sold)} itens vendidos por ${engine.formatMoney(result.gain)}.`);
    }
    if (action === "toggle-auto-sell") act(engine.toggleAutoSell(cropId), result => `Venda automática de ${result.crop.name.toLowerCase()} ${result.enabled ? "ativada" : "desativada"}.`);
    if (action === "buy-upgrade") act(engine.buyUpgrade(id), "Infraestrutura aprimorada.");
    if (action === "buy-research") act(engine.buyResearch(id), "Nova etapa da pesquisa concluída.");
    if (action === "buy-prestige-upgrade") act(engine.buyPrestigeUpgrade(id), "Legado permanente aprimorado.");
    if (action === "accept-contract") act(engine.acceptContract(id), result => `Contrato com ${engine.getCompany(result.contract.companyId).name} aceito.`);
    if (action === "decline-contract") act(engine.declineContract(id), "Proposta recusada. Uma nova empresa entrou em contato.");
    if (action === "deliver-contract") act(engine.deliverContract(id), result => result.completed
      ? `Contrato concluído: +${engine.formatMoney(result.contract.rewardCoins)}${result.contract.rewardResearch ? ` e +${result.contract.rewardResearch} pesquisa` : ""}.`
      : `${engine.formatNumber(result.delivered)} unidades entregues ao contrato.`);
    if (action === "deliver-order") act(engine.deliverOrder(cropId), result => result.completed
      ? `Pedido concluído: +${engine.formatMoney(result.order.rewardCoins)}${result.order.rewardResearch ? ` e +${result.order.rewardResearch} pesquisa` : ""}.`
      : `${engine.formatNumber(result.delivered)} unidades entregues. O progresso ficou salvo.`);
    if (action === "claim-mission") act(engine.claimMission(id), "Missão concluída. Recompensa adicionada aos recursos.");
    if (action === "perform-prestige") {
      const gain = engine.getPrestigeEstimate();
      if (gain < 1) return;
      if (!window.confirm("Prestigiar agora reiniciará os recursos e o progresso desta jornada. Continuar?")) return;
      act(engine.performPrestige(), result => `Nova jornada iniciada com +${result.gain} ${result.gain === 1 ? "ponto de prestígio" : "pontos de prestígio"}.`);
    }
  }

  function setupEvents() {
    dom.tabs.forEach(tab => tab.addEventListener("click", () => showView(tab.dataset.view)));
    dom.officeTabs.forEach(tab => tab.addEventListener("click", () => {
      showOfficeTab(tab.dataset.officeTab);
      render(true);
    }));
    dom.evolutionTabs.forEach(tab => tab.addEventListener("click", () => {
      showEvolutionTab(tab.dataset.evolutionTab);
      render(true);
    }));
    $$('[data-go-view]').forEach(link => link.addEventListener("click", event => {
      event.preventDefault();
      showView(link.dataset.goView);
    }));

    document.addEventListener("click", event => {
      const contractShortcut = event.target.closest("[data-go-office-contracts]");
      if (contractShortcut) {
        showView("officeView");
        showOfficeTab("contracts");
        render(true);
        return;
      }
      const button = event.target.closest("[data-action]");
      if (button && !button.disabled) handleAction(button);
    });

    [dom.searchCrop, dom.categoryFilter].forEach(control => {
      control.addEventListener(control.tagName === "INPUT" ? "input" : "change", () => render(true));
    });

    $("#sellAllStock").addEventListener("click", () => {
      act(engine.sellAll(), result => `${engine.formatNumber(result.sold)} produtos vendidos por ${engine.formatMoney(result.gain)}.`);
    });

    dom.rerollContracts.addEventListener("click", () => {
      act(engine.rerollContracts(), result => `Novas propostas chegaram por ${engine.formatMoney(result.cost)}.`);
    });

    $("#saveNow").addEventListener("click", () => {
      const saved = engine.save();
      toast(saved ? "Progresso salvo no navegador." : "Não foi possível salvar neste navegador.", saved ? "success" : "error");
    });

    $("#exportSave").addEventListener("click", () => {
      const content = engine.exportSave();
      dom.saveBox.value = content;
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `agricultura-industrial-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast("Save exportado e preparado para download.", "success");
    });

    $("#importSave").addEventListener("click", () => {
      const text = dom.saveBox.value.trim();
      if (!text) return toast("Cole um save no campo de texto primeiro.", "error");
      if (!window.confirm("Importar este save substituirá o progresso atual. Continuar?")) return;
      try {
        engine.importSave(text);
        applySettings();
        render(true);
        toast("Save importado com sucesso.", "success");
      } catch (error) {
        console.warn(error);
        toast("O texto não contém um save válido.", "error");
      }
    });

    $("#resetGame").addEventListener("click", () => {
      if (!window.confirm("Apagar todo o progresso, inclusive prestígio e legados? Esta ação não pode ser desfeita.")) return;
      engine.hardReset();
      applySettings();
      showView("farmView");
      toast("Uma nova fazenda foi criada.", "success");
    });

    dom.ambientSetting.addEventListener("change", () => {
      engine.setSetting("ambient", dom.ambientSetting.checked);
      applySettings();
    });
    dom.reducedMotionSetting.addEventListener("change", () => {
      engine.setSetting("reducedMotion", dom.reducedMotionSetting.checked);
      applySettings();
    });
    dom.compactCardsSetting.addEventListener("change", () => {
      engine.setSetting("compactCards", dom.compactCardsSetting.checked);
      applySettings();
      render(true);
    });
    dom.uiScaleSetting.addEventListener("input", () => {
      engine.setSetting("uiScale", Number(dom.uiScaleSetting.value));
      applySettings();
    });

    window.addEventListener("beforeunload", () => engine.save());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        engine.save();
      } else {
        const now = Date.now();
        const elapsed = Math.max(0, Math.min(GameEngine.MAX_OFFLINE_SECONDS, (now - Number(engine.state.lastUpdate || now)) / 1000));
        if (elapsed > 0.05) {
          const before = engine.state.stats.totalHarvested;
          const failedBefore = engine.state.stats.contractsFailed;
          engine.simulate(elapsed, true);
          const harvested = Math.max(0, engine.state.stats.totalHarvested - before);
          const expired = Math.max(0, engine.state.stats.contractsFailed - failedBefore);
          if (elapsed >= 10 && harvested > 0) toast(`Enquanto a aba esteve em segundo plano, a fazenda produziu ${engine.formatNumber(harvested)} itens.`);
          if (expired > 0) toast(`${expired} contrato${expired === 1 ? " expirou" : "s expiraram"} em segundo plano. As unidades entregues foram perdidas.`, "error");
          engine.state.lastUpdate = now;
          render(true);
        }
      }
      lastFrame = performance.now();
    });
  }

  function gameLoop(now) {
    const dt = Math.max(0, Math.min(2, (now - lastFrame) / 1000));
    lastFrame = now;
    engine.tick(dt);
    updateLiveHeader(now);
    updateLiveFarmUI(now);
    render(false);

    if (now - lastSave >= 15000) {
      engine.save();
      lastSave = now;
    }
    requestAnimationFrame(gameLoop);
  }

  function boot() {
    setupCategoryFilter();
    setupEvents();
    const hashView = location.hash.replace("#", "");
    if (hashView && dom.views.some(view => view.id === hashView)) activeView = hashView;
    showView(activeView, false);
    applySettings();
    render(true);
    requestAnimationFrame(gameLoop);
  }

  boot();
})();
