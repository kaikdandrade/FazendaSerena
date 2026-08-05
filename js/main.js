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
  let showCompletedMissions = false;
  const cropUpgradeModes = new Map();

  const dom = {
    tabs: $$(".nav-tab[data-view]"),
    views: $$("[data-view-panel]"),
    cropGrid: $("#cropGrid"),
    cropEmpty: $("#cropEmpty"),
    searchCrop: $("#searchCrop"),
    categoryFilter: $("#categoryFilter"),
    stockCategoryFilter: $("#stockCategoryFilter"),
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
    orderList: $("#orderList"),
    missionList: $("#missionList"),
    toggleCompletedMissions: $("#toggleCompletedMissions"),
    completedMissionCount: $("#completedMissionCount"),
    officeTabs: $$("[data-office-tab]"),
    officePanels: $$("[data-office-panel]"),
    evolutionTabs: $$("[data-evolution-tab]"),
    evolutionPanels: $$("[data-evolution-panel]"),
    contextNavBlocks: $$("[data-context-for]"),
    contractTabCount: $("#contractTabCount"),
    orderTabCount: $("#orderTabCount"),
    missionTabCount: $("#missionTabCount"),
    toastZone: $("#toastZone"),
    saveBox: $("#saveBox"),
    coinsCounter: $("#coinsCounter"),
    researchCounter: $("#researchCounter"),
    prestigeCounter: $("#prestigeCounter"),
    farmLevelLabel: $("#farmLevelLabel"),
    farmXPBar: $("#farmXPBar"),
    farmXPText: $("#farmXPText"),
    stockNavTab: $("#stockNavTab"),
    stockNavBadge: $("#stockNavBadge"),
    officeNavTab: $("#officeNavTab"),
    officeNavBadge: $("#officeNavBadge"),
    statsHero: $("#statsHero"),
    lifetimeStats: $("#lifetimeStats"),
    recordStats: $("#recordStats"),
    achievementSummary: $("#achievementSummary"),
    achievementGrid: $("#achievementGrid"),
    ambientSetting: $("#ambientSetting"),
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
    dom.stockCategoryFilter?.insertAdjacentHTML("beforeend", options);
  }

  function showView(viewId, updateHash = true) {
    activeView = dom.views.some(view => view.id === viewId) ? viewId : "farmView";
    dom.views.forEach(view => view.classList.toggle("active", view.id === activeView));
    dom.tabs.forEach(tab => {
      const active = tab.dataset.view === activeView;
      tab.classList.toggle("active", active);
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    dom.contextNavBlocks.forEach(block => {
      const visible = block.dataset.contextFor === activeView;
      block.hidden = !visible;
      block.classList.toggle("active", visible);
    });
    if (updateHash) history.replaceState(null, "", `#${activeView}`);
    window.scrollTo({ top: 0, behavior: "auto" });
    render(true);
  }

  function applySettings() {
    const settings = engine.state.settings;
    document.body.dataset.ambient = String(Boolean(settings.ambient));
    document.body.classList.remove("reduce-motion");
    document.body.classList.add("compact-cards");
    document.documentElement.style.setProperty("--ui-scale", String(((Number(settings.uiScale) || 100) / 100) * 0.85));

    if (dom.ambientSetting && document.activeElement !== dom.ambientSetting) dom.ambientSetting.checked = Boolean(settings.ambient);
    if (dom.uiScaleSetting && document.activeElement !== dom.uiScaleSetting) dom.uiScaleSetting.value = String(settings.uiScale || 100);
    if (dom.uiScaleText) dom.uiScaleText.textContent = `${settings.uiScale || 100}%`;
  }

  function updateStockNavigation(metrics = engine.getMetrics()) {
    const used = Math.max(0, Number(metrics.stock) || 0);
    const capacity = Math.max(1, Number(metrics.storageCapacity) || 1);
    const usage = percent((used / capacity) * 100);
    const full = used >= capacity;
    dom.stockNavTab.style.setProperty("--stock-progress", `${usage}%`);
    dom.stockNavTab.classList.toggle("stock-full", full);
    dom.stockNavBadge.hidden = !full;
    dom.stockNavTab.setAttribute("aria-label", full
      ? `Estoque cheio: ${engine.formatNumber(used)} de ${engine.formatNumber(capacity)} espaços usados.`
      : `Estoque: ${engine.formatNumber(used)} de ${engine.formatNumber(capacity)} espaços usados, ${Math.floor(usage)} por cento.`);
    dom.stockNavTab.title = full
      ? "Estoque cheio — venda produtos ou amplie o celeiro"
      : `Estoque ${Math.floor(usage)}% ocupado`;
  }

  function updateOfficeNavigation(activeContracts, readyOrders, readyMissions) {
    const claimable = engine.getReadyContractCount();
    const hasProposalsToReview = engine.state.contractOffers.length > 0 && activeContracts < GameEngine.MAX_ACTIVE_CONTRACTS;
    const needsAttention = activeContracts > 0 || hasProposalsToReview || readyOrders > 0 || readyMissions > 0;
    dom.officeNavTab.classList.toggle("has-attention", needsAttention);
    dom.officeNavBadge.hidden = !needsAttention;

    const reasons = [];
    if (claimable > 0) reasons.push(`${claimable} recompensa${claimable === 1 ? " pronta" : "s prontas"}`);
    else if (activeContracts > 0) reasons.push(`${activeContracts} contrato${activeContracts === 1 ? " em andamento" : "s em andamento"}`);
    if (hasProposalsToReview) reasons.push("propostas disponíveis");
    if (readyOrders > 0) reasons.push(`${readyOrders} pedido${readyOrders === 1 ? " pronto" : "s prontos"}`);
    if (readyMissions > 0) reasons.push(`${readyMissions} missão${readyMissions === 1 ? " pronta" : "ões prontas"}`);
    dom.officeNavTab.setAttribute("aria-label", needsAttention ? `Escritório: ${reasons.join(", ")}.` : "Escritório: nenhuma ação pendente.");
    dom.officeNavTab.title = needsAttention ? `Há ações no escritório: ${reasons.join(", ")}` : "Nenhuma ação pendente no escritório";
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
    updateStockNavigation(metrics);
    const activeContracts = state.activeContracts.length;
    const readyOrders = engine.getReadyOrderCount();
    const readyMissions = engine.getReadyMissionCount();
    updateOfficeNavigation(activeContracts, readyOrders, readyMissions);
    dom.contractTabCount.textContent = String(activeContracts);
    dom.orderTabCount.textContent = String(readyOrders);
    dom.missionTabCount.textContent = String(readyMissions);
    renderContractDock();
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
    updateStockNavigation({
      stock: engine.getStorageUsed(),
      storageCapacity: engine.getStorageCap()
    });
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
      const activeContracts = engine.state.activeContracts.filter(contract => contract.cropId === cropId && contract.delivered < contract.amount && contract.timeRemaining > 0 && !contract.completedAt);
      const autoOrder = engine.hasActiveAutoOrderForCrop(cropId);
      const directRoute = cropState.autoSell || autoOrder || activeContracts.length > 0;
      const paused = storageRemaining <= 0 && !directRoute;
      const progress = instant ? 100 : percent(cropState.progress * 100);
      const ring = $('[data-crop-ring]', card);
      const progressLabel = $('[data-crop-percent]', card);
      const cycle = $('[data-crop-cycle]', card);
      const stock = $('[data-crop-stock]', card);
      const route = $('[data-crop-route]', card);

      if (ring) {
        const previous = Number(ring.dataset.lastProgress || 0);
        const wrapped = !instant && previous > 88 && progress < 25;
        if (wrapped) {
          ring.classList.add("progress-resetting");
          ring.style.setProperty("--growth-progress", "0%");
          void ring.offsetWidth;
          requestAnimationFrame(() => {
            ring.classList.remove("progress-resetting");
            ring.style.setProperty("--growth-progress", `${progress}%`);
          });
        } else {
          ring.style.setProperty("--growth-progress", `${progress}%`);
        }
        ring.dataset.lastProgress = String(progress);
        ring.classList.toggle("instant", instant);
        ring.classList.toggle("paused", paused);
      }
      if (progressLabel) progressLabel.textContent = instant ? "∞" : paused ? "Ⅱ" : `${Math.floor(progress)}%`;
      if (cycle) cycle.textContent = instant ? "Contínua" : paused ? "Pausada" : formatLiveTime((1 - cropState.progress) * growthTime);
      if (stock) stock.textContent = engine.formatNumber(cropState.stock);
      if (route) {
        const kind = activeContracts.length ? "contract" : autoOrder ? "order" : cropState.autoSell ? "auto" : "stock";
        route.className = `crop-route-pill route-${kind}`;
        route.textContent = activeContracts.length ? `Contrato${activeContracts.length > 1 ? ` ×${activeContracts.length}` : ""}` : autoOrder ? "Pedido auto" : cropState.autoSell ? "Venda auto" : "Estoque";
      }
      card.classList.toggle("auto-sell-enabled", Boolean(cropState.autoSell));

      if (updateControls) updateCropUpgradePanel(card, cropId);
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

  function getCropUpgradeMode(cropId) {
    return cropUpgradeModes.get(cropId) === "max" ? "max" : "one";
  }

  function getCropUpgradeSelection(cropId) {
    const cropState = engine.state.crops[cropId];
    const mode = getCropUpgradeMode(cropId);
    const maxed = cropState.level >= GameEngine.MAX_CROP_LEVEL;
    const oneCost = maxed ? 0 : engine.getCropUpgradeCost(cropId);
    const affordablePlan = engine.getCropAffordableUpgrades(cropId);
    const levels = mode === "max" ? affordablePlan.levels : maxed ? 0 : 1;
    const affordable = !maxed && (mode === "max" ? levels > 0 : engine.state.coins >= oneCost);
    // Sem níveis acessíveis, mostramos o custo do próximo nível em vez de “0”.
    const cost = mode === "max"
      ? (levels > 0 ? affordablePlan.totalCost : affordablePlan.nextCost)
      : oneCost;
    return { mode, maxed, oneCost, affordablePlan, cost, levels, affordable };
  }

  function updateCropUpgradePanel(card, cropId) {
    const cropState = engine.state.crops[cropId];
    if (!cropState?.owned) return;
    const selection = getCropUpgradeSelection(cropId);
    $$('[data-upgrade-mode]', card).forEach(button => {
      const active = button.dataset.upgradeMode === selection.mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const summary = $('[data-crop-upgrade-summary]', card);
    const action = $('[data-crop-upgrade-action]', card);
    if (summary) {
      summary.innerHTML = selection.maxed
        ? `<span>Nível máximo alcançado</span><strong>300 / 300</strong>`
        : `<span>${selection.mode === "max" ? (selection.levels > 0 ? `Máximo pelo saldo · +${selection.levels} nível${selection.levels === 1 ? "" : "is"}` : "Próximo nível ainda indisponível") : "Próximo nível"}</span><strong>${resourceAmount("coins", -selection.cost, { sign: true, compact: true })}</strong>`;
    }
    if (action) {
      action.disabled = selection.maxed || !selection.affordable;
      action.innerHTML = selection.maxed
        ? "Plantação concluída"
        : selection.affordable
          ? `${selection.mode === "max" ? `Aprimorar +${selection.levels}` : "Aprimorar +1"} ${resourceAmount("coins", -selection.cost, { sign: true, compact: true })}`
          : "Saldo insuficiente";
    }
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
          <div class="crop-level-strip locked-level-strip"><span data-crop-purchase-status>${!unlocked ? `Libera no nível ${crop.unlockLevel}` : canAffordPurchase ? "Disponível para compra" : "Saldo insuficiente"}</span></div>
          <div class="crop-head">
            <div class="crop-art locked-art"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"></div>
            <div class="crop-info">
              <div class="crop-title-row"><h3>${escapeHtml(crop.name)}</h3></div>
              <div class="crop-meta-row"><span class="crop-category">${escapeHtml(category)}</span><span class="locked-cycle">Ciclo: ${crop.baseGrowth}s</span></div>
            </div>
          </div>
          <button class="button primary full crop-buy-button" type="button" data-action="buy-crop" data-crop="${crop.id}" data-crop-purchase ${unlocked && canAffordPurchase ? "" : "disabled"}>${purchaseLabel}</button>
        </article>`;
    }

    const growthTime = engine.getGrowthTime(crop.id);
    const instant = growthTime <= 0;
    const growthPct = instant ? 100 : percent(data.progress * 100);
    const activeContracts = engine.state.activeContracts.filter(contract => contract.cropId === crop.id && contract.delivered < contract.amount && !contract.completedAt);
    const autoOrder = engine.hasActiveAutoOrderForCrop(crop.id);
    const directRoute = data.autoSell || autoOrder || activeContracts.length > 0;
    const storageFull = engine.getStorageRemaining() <= 0 && !directRoute;
    const speedMaxed = data.level >= GameEngine.INSTANT_GROWTH_LEVEL;
    const routeKind = activeContracts.length ? "contract" : autoOrder ? "order" : data.autoSell ? "auto" : "stock";
    const routeLabel = activeContracts.length ? `Contrato${activeContracts.length > 1 ? ` ×${activeContracts.length}` : ""}` : autoOrder ? "Pedido auto" : data.autoSell ? "Venda auto" : "Estoque";
    const cycleLabel = instant ? "Contínua" : storageFull ? "Pausada" : formatLiveTime((1 - data.progress) * growthTime);
    const selection = getCropUpgradeSelection(crop.id);

    return `
      <article class="crop-card ${data.autoSell ? "auto-sell-enabled" : ""}" data-live-crop="${crop.id}" style="--crop-glow:${getCropGlow(crop.category)}">
        <div class="crop-level-strip" ${speedMaxed ? 'title="Velocidade máxima; níveis 251–300 aprimoram o rendimento desta cultura"' : ""}>
          <span class="crop-level-compact">Nível <strong>${data.level}</strong><small>/ ${GameEngine.MAX_CROP_LEVEL}</small></span>
          <span class="crop-route-pill route-${routeKind}" data-crop-route>${routeLabel}</span>
        </div>
        <div class="crop-head">
          <div class="crop-art-progress ${storageFull ? "paused" : ""} ${instant ? "instant" : ""}" data-crop-ring data-last-progress="${growthPct}" style="--growth-progress:${growthPct}%" title="Progresso da produção">
            <div class="crop-art"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"></div>
            <span class="crop-progress-percent" data-crop-percent>${instant ? "∞" : storageFull ? "Ⅱ" : `${Math.floor(growthPct)}%`}</span>
          </div>
          <div class="crop-info">
            <div class="crop-title-row"><h3>${escapeHtml(crop.name)}</h3>${speedMaxed ? '<span class="instant-mini" title="Velocidade máxima">∞</span>' : ""}</div>
            <div class="crop-meta-row"><span class="crop-category">${escapeHtml(category)}</span></div>
            <div class="crop-quick-stats">
              <span title="Tempo restante"><i>◷</i><b data-crop-cycle>${cycleLabel}</b></span>
              <span title="Estoque desta cultura"><i>🧺</i><b data-crop-stock>${engine.formatNumber(data.stock)}</b></span>
            </div>
          </div>
        </div>
        <div class="crop-upgrade-panel crop-upgrade-redesign">
          <div class="upgrade-mode-selector" role="group" aria-label="Quantidade de aprimoramentos">
            <button class="upgrade-mode-option ${selection.mode === "one" ? "active" : ""}" type="button" data-action="select-upgrade-mode" data-upgrade-mode="one" data-crop="${crop.id}" aria-pressed="${selection.mode === "one"}">+1 nível</button>
            <button class="upgrade-mode-option ${selection.mode === "max" ? "active" : ""}" type="button" data-action="select-upgrade-mode" data-upgrade-mode="max" data-crop="${crop.id}" aria-pressed="${selection.mode === "max"}">Máximo possível</button>
          </div>
          <div class="crop-upgrade-summary" data-crop-upgrade-summary>${selection.maxed ? `<span>Nível máximo alcançado</span><strong>300 / 300</strong>` : `<span>${selection.mode === "max" ? (selection.levels > 0 ? `Máximo pelo saldo · +${selection.levels} nível${selection.levels === 1 ? "" : "is"}` : "Próximo nível ainda indisponível") : "Próximo nível"}</span><strong>${resourceAmount("coins", -selection.cost, { sign: true, compact: true })}</strong>`}</div>
          <button class="button primary full crop-upgrade-cta" type="button" data-action="upgrade-crop-selected" data-crop="${crop.id}" data-crop-upgrade-action ${selection.maxed || !selection.affordable ? "disabled" : ""}>${selection.maxed ? "Plantação concluída" : selection.affordable ? `${selection.mode === "max" ? `Aprimorar +${selection.levels}` : "Aprimorar +1"} ${resourceAmount("coins", -selection.cost, { sign: true, compact: true })}` : "Saldo insuficiente"}</button>
        </div>
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
    const categoryFilter = dom.stockCategoryFilter?.value || "all";
    const allOwned = engine.data.crops.filter(crop => engine.state.crops[crop.id].owned);
    const owned = allOwned.filter(crop => categoryFilter === "all" || crop.category === categoryFilter);
    const totalCapacity = engine.getStorageCap();
    const storageUsed = engine.getStorageUsed();
    const storagePct = percent((storageUsed / totalCapacity) * 100);
    const totalValue = allOwned.reduce((sum, crop) => sum + engine.state.crops[crop.id].stock * engine.getSalePrice(crop.id), 0);
    const expansionCost = engine.getDirectStorageExpansionCost();
    const canExpandStorage = engine.state.coins >= expansionCost;

    dom.stockSummary.innerHTML = `
      <article class="summary-card storage-capacity-card normalized-summary-card">
        <div class="summary-card-heading"><div><small>Estoque compartilhado</small><strong>${engine.formatNumber(storageUsed)} / ${engine.formatNumber(totalCapacity)}</strong></div><span class="summary-status ${storagePct >= 100 ? "full" : ""}">${storagePct >= 100 ? "Cheio" : "Capacidade"}</span></div>
        <div class="progress-track growth"><span style="width:${Math.min(100, storagePct)}%"></span></div>
        <button class="button soft full" type="button" data-action="expand-storage" ${canExpandStorage ? "" : "disabled"}>${canExpandStorage ? `Adicionar +100 espaços ${resourceAmount("coins", -expansionCost, { sign: true, compact: true })}` : "Saldo insuficiente"}</button>
      </article>
      <article class="summary-card stock-sale-summary normalized-summary-card">
        <div class="summary-card-heading"><div><small>Venda geral</small><strong>${engine.formatNumber(storageUsed)} itens</strong></div><span class="summary-status">Mercado</span></div>
        <p>Venda todo o conteúdo armazenado de uma só vez.</p>
        <button class="button primary full" type="button" data-action="sell-all-stock" ${storageUsed <= 0 ? "disabled" : ""}>${storageUsed > 0 ? `Vender estoque ${resourceAmount("coins", totalValue, { compact: true })}` : "Estoque vazio"}</button>
      </article>`;

    if (!allOwned.length) {
      dom.stockGrid.innerHTML = `<div class="empty-state">Compre sua primeira cultura para começar a encher o celeiro.</div>`;
      return;
    }
    if (!owned.length) {
      dom.stockGrid.innerHTML = `<div class="empty-state">Nenhum item pertence à categoria selecionada.</div>`;
      return;
    }

    dom.stockGrid.innerHTML = owned.map(crop => {
      const data = engine.state.crops[crop.id];
      const price = engine.getSalePrice(crop.id);
      const activeContracts = engine.state.activeContracts.filter(contract => contract.cropId === crop.id && contract.delivered < contract.amount && !contract.completedAt).length;
      const autoOrder = engine.hasActiveAutoOrderForCrop(crop.id);
      const priorityText = activeContracts ? `${activeContracts} contrato${activeContracts === 1 ? " ativo" : "s ativos"}` : autoOrder ? "Pedido automático ativo" : "";
      return `
        <article class="stock-card normalized-stock-card ${data.autoSell ? "auto-sell-card" : ""}">
          <div class="stock-head"><div class="stock-ident"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"><div><h3>${escapeHtml(crop.name)}</h3><small>${escapeHtml(engine.data.categories[crop.category])}</small></div></div></div>
          <div class="stock-value-grid"><div><small>Quantidade</small><strong>${engine.formatNumber(data.stock)} <span>un.</span></strong></div><div><small>Valor unitário</small><strong>${resourceAmount("coins", price, { compact: true })}</strong></div><div><small>Valor guardado</small><strong>${resourceAmount("coins", data.stock * price, { compact: true })}</strong></div></div>
          <button class="auto-sell-toggle compact-auto-toggle ${data.autoSell ? "active" : ""}" type="button" data-action="toggle-auto-sell" data-crop="${crop.id}" aria-pressed="${String(data.autoSell)}"><span><strong>Venda automática</strong><small>${data.autoSell ? "Ativada" : "Desativada"}</small></span><span class="auto-sell-switch"><i></i></span></button>
          ${priorityText ? `<div class="stock-priority-note"><strong>${escapeHtml(priorityText)}</strong><small>Contratos têm prioridade; depois vêm pedidos automáticos e venda automática.</small></div>` : ""}
          <div class="stock-actions"><button class="button secondary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="0.25" ${data.stock <= 0 ? "disabled" : ""}>25%</button><button class="button secondary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="0.5" ${data.stock <= 0 ? "disabled" : ""}>50%</button><button class="button primary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="1" ${data.stock <= 0 ? "disabled" : ""}>Vender tudo</button></div>
        </article>`;
    }).join("");
  }

  function renderUpgradeCard(item, kind) {
    const source = kind === "upgrade" ? engine.state.upgrades : kind === "research" ? engine.state.researchTechs : engine.state.prestigeUpgrades;
    const level = Number(source[item.id] || 0);
    const maxed = level >= item.max;
    const cost = maxed ? 0 : engine.getUpgradeCost(item, source);
    const resourceType = kind === "upgrade" ? "coins" : kind === "research" ? "research" : "prestige";
    const availableResource = kind === "upgrade" ? engine.state.coins : kind === "research" ? engine.state.research : engine.state.prestigePoints;
    const affordable = !maxed && availableResource >= cost;
    const action = kind === "upgrade" ? "buy-upgrade" : kind === "research" ? "buy-research" : "buy-prestige-upgrade";
    return `
      <article class="upgrade-card normalized-upgrade-card ${!maxed && !affordable ? "unaffordable" : ""}">
        <div class="upgrade-head"><div><h3>${escapeHtml(item.name)}</h3><span class="crop-category">Nível ${level} / ${item.max}</span></div><span class="upgrade-icon" aria-hidden="true">${item.icon}</span></div>
        <p>${enrichResourceText(item.desc)}</p>
        <button class="button ${kind === "prestige" ? "gold" : "primary"} full" type="button" data-action="${action}" data-id="${item.id}" ${maxed || !affordable ? "disabled" : ""}>${maxed ? "Concluído" : affordable ? `Aprimorar ${resourceAmount(resourceType, -cost, { sign: true, compact: true })}` : "Recurso insuficiente"}</button>
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
    const prestigeUnlocked = engine.state.farmLevel >= 15;
    const drivers = [
      { label: "Nível da fazenda", value: `${engine.state.farmLevel} / 15`, ready: prestigeUnlocked },
      { label: "Moedas desta jornada", value: resourceAmount("coins", engine.state.stats.runCoinsEarned), ready: engine.state.stats.runCoinsEarned > 0 },
      { label: "Culturas compradas", value: `${metrics.owned} / ${engine.data.crops.length}`, ready: metrics.owned > 0 },
      { label: "Contratos concluídos", value: engine.state.stats.contractsCompleted, ready: engine.state.stats.contractsCompleted > 0 }
    ];
    dom.prestigeDashboard.innerHTML = `
      <section class="prestige-overview-card normalized-prestige-card ${!prestigeUnlocked ? "prestige-locked" : ""}">
        <div class="prestige-copy"><p class="eyebrow">novo ciclo</p><h2>${prestigeUnlocked ? "Transforme esta jornada em legado" : "Prestígio desbloqueia no nível 15"}</h2><p>${prestigeUnlocked ? "O cálculo usa somente o progresso renovável desta jornada." : `Continue evoluindo a fazenda. Faltam ${Math.max(0, 15 - engine.state.farmLevel)} níveis para liberar o prestígio.`}</p></div>
        <div class="prestige-gain-card"><small>Ganho estimado</small><strong>${resourceAmount("prestige", gain, { sign: true })}</strong><span>${prestigeUnlocked ? (engine.state.permanentBonuses.prestigeDouble ? "Bônus permanente 2× ativo" : "Aumente a jornada para ganhar mais") : "Desbloqueia no nível 15"}</span></div>
      </section>
      <section class="prestige-requirements normalized-prestige-requirements"><div class="prestige-requirements-head"><div><small>Requisitos da jornada</small><h3>Progresso que será convertido</h3></div><span>${prestigeUnlocked && gain > 0 ? "Pronto" : "Em progresso"}</span></div><div class="prestige-driver-grid">${drivers.map(item => `<article class="${item.ready ? "ready" : ""}"><div><small>${item.label}</small><strong>${item.value}</strong></div></article>`).join("")}</div></section>
      <section class="prestige-action-card"><div><strong>Ao prestigiar</strong><p>Moedas, pesquisa, nível, culturas, estoque, evoluções, contratos e pedidos da jornada serão reiniciados.</p></div><button class="button gold" type="button" data-action="perform-prestige" ${!prestigeUnlocked || gain < 1 ? "disabled" : ""}>${!prestigeUnlocked ? "Desbloqueia no nível 15" : gain < 1 ? "Ganho insuficiente" : `Prestigiar ${resourceAmount("prestige", gain, { sign: true, compact: true })}`}</button></section>`;
    showEvolutionTab(activeEvolutionTab);
  }

  function showOfficeTab(tabId) {
    activeOfficeTab = ["contracts", "orders", "missions", "stats"].includes(tabId) ? tabId : "contracts";
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
      <button class="contract-dock-title" type="button" data-go-office-contracts><strong>Contratos</strong><small>${contracts.length}/${GameEngine.MAX_ACTIVE_CONTRACTS}</small></button>
      <div class="contract-dock-list">
        ${contracts.map(contract => {
          const crop = engine.getCrop(contract.cropId);
          const company = engine.getCompany(contract.companyId);
          const progress = engine.getContractProgress(contract);
          const urgent = !progress.completed && contract.timeRemaining <= 30;
          return `<button class="contract-dock-item ${urgent ? "deadline-warning" : ""} ${progress.completed ? "reward-ready" : ""}" type="button" data-go-office-contracts title="Abrir contratos">
            <img src="${crop.image}" alt="${escapeHtml(crop.name)}">
            <span><small>${escapeHtml(company.name)}</small><strong>${escapeHtml(crop.name)}</strong><i><b class="delivered" style="width:${percent(progress.percent)}%"></b></i><u>${progress.completed ? "Recompensa pronta" : `${engine.formatTime(contract.timeRemaining)} restantes`}</u></span>
            <em class="${progress.completed ? "ready" : ""}">${Math.floor(progress.percent)}%<small>${progress.completed ? "Receber" : "entregue"}</small></em>
          </button>`;
        }).join("")}
      </div>`;
  }

  function renderContracts() {
    const owned = engine.getOwnedCrops();
    if (!owned.length) {
      dom.contractCapacity.innerHTML = "";
      dom.activeContractList.innerHTML = `<div class="empty-state office-empty">Compre sua primeira cultura para começar a receber propostas de empresas.</div>`;
      dom.contractOfferList.innerHTML = "";
      return;
    }

    engine.ensureContractOffers();
    const active = engine.state.activeContracts;
    const offers = engine.state.contractOffers;
    const cooldowns = engine.state.contractCooldowns || [];
    const openSlots = Math.max(0, GameEngine.MAX_ACTIVE_CONTRACTS - active.length);
    dom.contractCapacity.innerHTML = "";

    const rewardsLine = contract => `<div class="contract-reward-unified"><span>Recompensa</span><strong class="resource-reward-group">${resourceRewards({ coins: contract.rewardCoins, research: contract.rewardResearch })}</strong></div>`;

    dom.activeContractList.innerHTML = active.length ? active.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const difficulty = engine.getContractDifficulty(contract.difficulty);
      const progress = engine.getContractProgress(contract);
      const urgent = !progress.completed && contract.timeRemaining <= 30;
      if (progress.completed) {
        return `<article class="contract-card active-contract-card contract-completed-card normalized-contract-card">
          <div class="company-ribbon text-only-ribbon"><div><small>Contrato com</small><strong>${escapeHtml(company.name)}</strong></div><em>${escapeHtml(company.specialty)}</em></div>
          <div class="contract-head"><div class="contract-crop"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Produto contratado</small><h3>${engine.formatNumber(contract.amount)} ${escapeHtml(crop.name.toLowerCase())}</h3></div></div><span class="status-tag completed-tag">Concluído</span></div>
          ${rewardsLine(contract)}
          <button class="button gold full reward-claim-button" type="button" data-action="claim-contract" data-id="${contract.id}">Receber recompensas</button>
        </article>`;
      }
      return `<article class="contract-card active-contract-card normalized-contract-card ${urgent ? "contract-deadline-warning" : ""}">
        <div class="company-ribbon text-only-ribbon"><div><small>Contrato com</small><strong>${escapeHtml(company.name)}</strong></div><em>${escapeHtml(company.specialty)}</em></div>
        <div class="contract-head"><div class="contract-crop"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Produto contratado</small><h3>${escapeHtml(crop.name)}</h3></div></div><span class="status-tag active-tag">Em andamento</span></div>
        <div class="contract-time-panel ${urgent ? "urgent" : ""}"><span><strong>${escapeHtml(difficulty.label)}</strong></span><b>${engine.formatTime(contract.timeRemaining)}</b></div>
        <div class="contract-progress-block"><div class="progress-label"><span>Entregue</span><strong>${engine.formatNumber(progress.delivered)} / ${engine.formatNumber(contract.amount)}</strong></div><div class="progress-track contract-progress-track"><span class="contract-delivered" style="width:${percent(progress.percent)}%"></span></div></div>
        ${rewardsLine(contract)}
        <small class="contract-loss-warning">Se o prazo terminar, as unidades entregues serão perdidas.</small>
      </article>`;
    }).join("") : `<div class="empty-state office-empty compact-empty">Nenhum contrato ativo. Escolha até três propostas abaixo.</div>`;

    const offerCards = offers.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const difficulty = engine.getContractDifficulty(contract.difficulty);
      return `<article class="contract-card contract-offer-card normalized-contract-card">
        <div class="company-ribbon text-only-ribbon offer-ribbon"><div><small>Proposta de</small><strong>${escapeHtml(company.name)}</strong></div><em>${escapeHtml(company.specialty)}</em></div>
        <div class="contract-head"><div class="contract-crop"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Solicitação empresarial</small><h3>${engine.formatNumber(contract.amount)} unidades de ${escapeHtml(crop.name.toLowerCase())}</h3></div></div><span class="status-tag proposal-tag">Proposta</span></div>
        <div class="contract-offer-meta"><span>${escapeHtml(difficulty.label)}</span><strong>${engine.formatTime(contract.durationSeconds)} após aceitar</strong></div>
        ${rewardsLine(contract)}
        <div class="contract-offer-actions"><button class="button secondary" type="button" data-action="decline-contract" data-id="${contract.id}">Recusar</button><button class="button primary" type="button" data-action="accept-contract" data-id="${contract.id}" ${openSlots < 1 ? "disabled" : ""}>${openSlots < 1 ? "Limite atingido" : "Aceitar contrato"}</button></div>
      </article>`;
    });
    const cooldownCards = cooldowns.map(cooldown => {
      const availableAt = Number(cooldown?.availableAt || cooldown || 0);
      const durationSeconds = Math.max(1, Number(cooldown?.durationSeconds || 120));
      const seconds = Math.max(0, Math.ceil((availableAt - Date.now()) / 1000));
      const progress = percent(100 - (seconds / durationSeconds) * 100);
      return `<article class="contract-card contract-cooldown-card" aria-live="polite"><div><small>Contato recusado</small><h3>Nova proposta em breve</h3><p>Uma nova empresa está preparando uma oferta.</p></div><strong>${engine.formatTime(seconds)}</strong><div class="progress-track"><span style="width:${progress}%"></span></div></article>`;
    });
    dom.contractOfferList.innerHTML = [...offerCards, ...cooldownCards].join("");
  }

  function renderOrders() {
    const owned = engine.getOwnedCrops();
    if (!owned.length) {
      dom.orderList.innerHTML = `<div class="empty-state office-empty">Cada cultura comprada libera automaticamente sua própria sequência de pedidos.</div>`;
      return;
    }

    dom.orderList.innerHTML = owned.map(crop => {
      const order = engine.getOrder(crop.id);
      const orderState = engine.state.orders[crop.id];
      const stock = engine.state.crops[crop.id].stock;
      if (order.complete) {
        return `
          <article class="order-card order-complete normalized-order-card">
            <div class="order-head"><div class="contract-crop"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Série completa</small><h3>${escapeHtml(crop.name)}</h3></div></div><span class="status-tag">${order.totalTiers}/${order.totalTiers}</span></div>
            <p>Todos os pedidos desta cultura foram atendidos.</p>
          </article>`;
      }

      const progress = percent((order.delivered / order.amount) * 100);
      const canDeliver = stock > 0;
      return `
        <article class="order-card normalized-order-card ${orderState.autoDeliver ? "auto-order-enabled" : ""}">
          <div class="order-head"><div class="contract-crop"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Pedido ${order.tier + 1} de ${order.totalTiers}</small><h3>${escapeHtml(crop.name)}</h3></div></div><span class="status-tag permanent-tag">Sem prazo</span></div>
          <p>Entregue ${engine.formatNumber(order.amount)} unidades. O progresso pode ser feito em várias remessas.</p>
          <div class="order-progress"><div class="progress-label"><span>Entregue</span><strong>${engine.formatNumber(order.delivered)} / ${engine.formatNumber(order.amount)}</strong></div><div class="progress-track growth"><span style="width:${progress}%"></span></div></div>
          <div class="contract-reward-unified"><span>Recompensa</span><strong class="resource-reward-group">${resourceRewards({ coins: order.rewardCoins, research: order.rewardResearch })}</strong></div>
          <button class="order-auto-toggle ${orderState.autoDeliver ? "active" : ""}" type="button" data-action="toggle-order-auto" data-crop="${crop.id}" aria-pressed="${String(orderState.autoDeliver)}"><span><strong>Entrega automática</strong><small>${orderState.autoDeliver ? "Prioridade após contratos" : "Enviar produção automaticamente"}</small></span><span class="auto-sell-switch"><i></i></span></button>
          <button class="button ${canDeliver ? "primary" : "secondary"} full" type="button" data-action="deliver-order" data-crop="${crop.id}" ${canDeliver ? "" : "disabled"}>${canDeliver ? "Entregar agora" : "Sem itens disponíveis"}</button>
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
    const activeMissions = engine.getActiveMissions();
    const claimedMissions = engine.data.missions.filter(mission => engine.state.missionsClaimed[mission.id]);
    const list = showCompletedMissions ? [...activeMissions, ...claimedMissions] : activeMissions;
    dom.missionList.innerHTML = list.map(mission => {
      const value = engine.missionValue(mission.metric, mission);
      const completed = value >= mission.target;
      const claimed = Boolean(engine.state.missionsClaimed[mission.id]);
      const progress = percent((value / mission.target) * 100);
      const seriesMissions = engine.data.missions.filter(item => (item.series || item.id) === (mission.series || mission.id));
      const stage = mission.stage || 1;
      return `<article class="mission-card ${claimed ? "claimed" : ""}">
        <div class="mission-head"><div><span class="mission-stage-label">Etapa ${stage} de ${seriesMissions.length}</span><h3>${escapeHtml(mission.title)}</h3><p>${escapeHtml(mission.desc)}</p></div><span class="status-tag">${claimed ? "Concluída" : completed ? "Pronta" : "Em andamento"}</span></div>
        <div class="mission-progress"><div class="progress-label"><span>Progresso</span><strong>${engine.formatNumber(Math.min(value, mission.target))} / ${engine.formatNumber(mission.target)}</strong></div><div class="progress-track growth"><span style="width:${progress}%"></span></div></div>
        <div class="mission-reward"><span>Recompensa</span><strong class="resource-reward-group">${rewardHtml(mission.reward)}</strong></div>
        ${claimed ? `<div class="mission-claimed-mark">✓ Recompensa recebida</div>` : `<button class="button ${completed ? "primary" : "secondary"} full" type="button" data-action="claim-mission" data-id="${mission.id}" ${completed ? "" : "disabled"}>${completed ? "Receber recompensa" : "Continue cultivando"}</button>`}
      </article>`;
    }).join("") || `<div class="empty-state">Todas as séries de missões foram concluídas.</div>`;
    if (dom.toggleCompletedMissions) {
      dom.toggleCompletedMissions.hidden = claimedMissions.length === 0;
      dom.toggleCompletedMissions.textContent = showCompletedMissions ? "Ocultar missões concluídas" : "Mostrar missões concluídas";
      dom.toggleCompletedMissions.setAttribute("aria-expanded", String(showCompletedMissions));
    }
    if (dom.completedMissionCount) dom.completedMissionCount.textContent = claimedMissions.length
      ? `${claimedMissions.length} de ${engine.data.missions.length} etapas concluídas na conta.`
      : "Nenhuma missão concluída ainda.";
  }

  function statCard(icon, label, value, note = "") {
    return `<article class="player-stat-card"><span class="player-stat-icon">${icon}</span><div><small>${escapeHtml(label)}</small><strong>${value}</strong>${note ? `<p>${escapeHtml(note)}</p>` : ""}</div></article>`;
  }

  function formatAccountAge(timestamp) {
    const seconds = Math.max(0, (Date.now() - Number(timestamp || Date.now())) / 1000);
    const days = Math.floor(seconds / 86400);
    if (days > 0) return `${days} dia${days === 1 ? "" : "s"}`;
    const hours = Math.floor(seconds / 3600);
    if (hours > 0) return `${hours} hora${hours === 1 ? "" : "s"}`;
    return `${Math.max(1, Math.floor(seconds / 60))} min`;
  }

  function renderStats() {
    const state = engine.state;
    const stats = state.stats;
    const claimed = engine.data.missions.filter(mission => state.missionsClaimed[mission.id]);
    const discovered = Object.keys(state.cropsDiscovered || {}).filter(id => state.cropsDiscovered[id]).length;
    const legacyLevels = Object.values(state.prestigeUpgrades).reduce((sum, value) => sum + Number(value || 0), 0);
    dom.statsHero.innerHTML = `<article class="stats-account-card"><div><p class="eyebrow">sua história</p><h2>${stats.prestiges > 0 ? `${stats.prestiges + 1}ª jornada da fazenda` : "Primeira jornada da fazenda"}</h2><p>Conta criada há ${formatAccountAge(state.createdAt)}. Estatísticas históricas e conquistas permanecem entre prestígios.</p></div><div class="stats-account-score"><small>Etapas de missão</small><strong>${claimed.length}<span>/ ${engine.data.missions.length}</span></strong></div></article>`;
    dom.lifetimeStats.innerHTML = [
      statCard("🪙", "Moedas recebidas", resourceAmount("coins", stats.lifetimeCoins), "Total de todas as jornadas"),
      statCard("🌾", "Itens produzidos", engine.formatNumber(stats.lifetimeHarvested), "Produção histórica"),
      statCard("🛒", "Itens vendidos", engine.formatNumber(stats.lifetimeSold), "Mercado manual e automático"),
      statCard("📑", "Contratos concluídos", engine.formatNumber(stats.lifetimeContractsCompleted), `${engine.formatNumber(stats.lifetimeContractUnitsDelivered)} unidades entregues`),
      statCard("🧾", "Pedidos concluídos", engine.formatNumber(stats.lifetimeOrdersCompleted), `${engine.formatNumber(stats.lifetimeOrderUnitsDelivered)} unidades entregues`),
      statCard("✨", "Prestígios realizados", engine.formatNumber(stats.prestiges), `${engine.formatNumber(stats.totalPrestigeEarned)} pontos conquistados`),
      statCard("📚", "Séries de pedidos finalizadas", engine.formatNumber(stats.completedOrderSeries), "Catálogos completos por cultura"),
      statCard("⚠️", "Contratos expirados", engine.formatNumber(stats.lifetimeContractsFailed), "Entregas perdidas por prazo")
    ].join("");
    dom.recordStats.innerHTML = [
      statCard("🏡", "Maior nível da fazenda", engine.formatNumber(stats.maxFarmLevel)),
      statCard("🌱", "Maior nível de cultura", engine.formatNumber(stats.maxCropLevel), "Limite atual: 300"),
      statCard("🧺", "Maior estoque ocupado", engine.formatNumber(stats.maxStorageUsed)),
      statCard("💰", "Maior saldo registrado", resourceAmount("coins", stats.maxCoinsHeld)),
      statCard("🌿", "Culturas descobertas", `${discovered} / ${engine.data.crops.length}`),
      statCard("🗂️", "Máximo de culturas na jornada", `${stats.maxCropsOwned} / ${engine.data.crops.length}`)
    ].join("");
    dom.achievementSummary.innerHTML = `<article><span>🏅</span><div><small>Missões concluídas</small><strong>${claimed.length} / ${engine.data.missions.length}</strong></div></article><article><span>🌳</span><div><small>Níveis de legado</small><strong>${legacyLevels}</strong></div></article><article><span>♾️</span><div><small>Bônus permanentes</small><strong>${state.permanentBonuses.prestigeDouble ? "Prestígio 2× ativo" : "Em construção"}</strong></div></article>`;
    const permanentAchievements = [];
    if (state.permanentBonuses.prestigeDouble) permanentAchievements.push(`<article class="achievement-card permanent-achievement"><span>∞</span><div><small>Bônus permanente</small><h3>Prestígio dos prestígios</h3><p>Todos os próximos prestígios concedem o dobro de pontos.</p></div></article>`);
    engine.data.prestigeUpgrades.forEach(item => {
      const level = Number(state.prestigeUpgrades[item.id] || 0);
      if (level > 0) permanentAchievements.push(`<article class="achievement-card legacy-achievement"><span>${item.icon}</span><div><small>Legado permanente · nível ${level}/${item.max}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.desc)}</p></div></article>`);
    });
    const missionAchievements = claimed.map(mission => `<article class="achievement-card"><span>✓</span><div><small>${mission.series ? `Etapa ${mission.stage}` : "Conquista"}</small><h3>${escapeHtml(mission.title)}</h3><p>${escapeHtml(mission.desc)}</p></div></article>`);
    const achievements = [...permanentAchievements, ...missionAchievements];
    dom.achievementGrid.innerHTML = achievements.length ? achievements.join("") : `<div class="empty-state">Missões concluídas, bônus permanentes e legados comprados aparecerão aqui e nunca serão apagados pelo prestígio.</div>`;
  }

  function render(force = false) {
    const now = performance.now();
    if (!force && now - lastRender < 1800) return;
    lastRender = now;
    renderHeader();
    applySettings();

    if (activeView === "farmView") {
      if (force || !dom.cropGrid.children.length) renderCrops();
    } else if (activeView === "stockView") {
      renderStock();
    } else if (activeView === "evolveView") {
      renderEvolutions();
    } else if (activeView === "officeView") {
      renderContracts();
      renderOrders();
      renderMissions();
      renderStats();
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

  function animateResourceReward(source, reward = {}) {
    if (!source) return;
    const sourceRect = source.getBoundingClientRect();
    const types = [
      ["coins", reward.coins, dom.coinsCounter],
      ["research", reward.research, dom.researchCounter],
      ["prestige", reward.prestige, dom.prestigeCounter]
    ].filter(([, value, target]) => Number(value) > 0 && target);
    types.forEach(([type, value, target], typeIndex) => {
      const targetRect = target.getBoundingClientRect();
      const particles = Math.min(9, Math.max(4, Math.ceil(Math.log10(Number(value) + 1) * 3)));
      for (let i = 0; i < particles; i += 1) {
        const particle = document.createElement("img");
        particle.className = `reward-particle reward-particle-${type}`;
        particle.src = resourceIcons[type];
        particle.alt = "";
        particle.style.left = `${sourceRect.left + sourceRect.width / 2 - 10}px`;
        particle.style.top = `${sourceRect.top + sourceRect.height / 2 - 10}px`;
        document.body.appendChild(particle);
        const spreadX = (Math.random() - .5) * 90;
        const spreadY = -30 - Math.random() * 55;
        const endX = targetRect.left + targetRect.width / 2 - sourceRect.left - sourceRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2 - sourceRect.top - sourceRect.height / 2;
        particle.animate([
          { transform: "translate(0,0) scale(.65)", opacity: 0 },
          { transform: `translate(${spreadX}px, ${spreadY}px) scale(1.08)`, opacity: 1, offset: .28 },
          { transform: `translate(${endX}px, ${endY}px) scale(.5)`, opacity: .15 }
        ], { duration: 720 + i * 45 + typeIndex * 80, delay: i * 35, easing: "cubic-bezier(.2,.75,.25,1)", fill: "forwards" }).finished.finally(() => particle.remove());
      }
    });
  }

  function handleAction(button) {
    const action = button.dataset.action;
    const cropId = button.dataset.crop;
    const id = button.dataset.id;

    if (action === "buy-crop") act(engine.buyCrop(cropId));
    if (action === "select-upgrade-mode") {
      cropUpgradeModes.set(cropId, button.dataset.upgradeMode === "max" ? "max" : "one");
      const card = button.closest("[data-live-crop]");
      if (card) updateCropUpgradePanel(card, cropId);
    }
    if (action === "upgrade-crop-selected") {
      const mode = getCropUpgradeMode(cropId);
      const result = mode === "max" ? engine.upgradeCropMax(cropId) : engine.upgradeCrop(cropId, 1);
      act(result, value => mode === "max"
        ? `${value.crop.name} recebeu ${value.purchased} aprimoramento${value.purchased === 1 ? "" : "s"} e chegou ao nível ${value.level}.`
        : `${value.crop.name} foi aprimorada para o nível ${value.level}.`);
    }
    if (action === "sell-fraction") {
      const stock = engine.state.crops[cropId]?.stock || 0;
      const amount = Math.max(1, Math.floor(stock * Number(button.dataset.fraction || 1)));
      act(engine.sellCrop(cropId, amount), result => `${engine.formatNumber(result.sold)} itens vendidos por ${engine.formatMoney(result.gain)}.`);
    }
    if (action === "toggle-auto-sell") act(engine.toggleAutoSell(cropId), result => `Venda automática de ${result.crop.name.toLowerCase()} ${result.enabled ? "ativada" : "desativada"}.`);
    if (action === "toggle-order-auto") act(engine.toggleOrderAutoDelivery(cropId), result => `Entrega automática de ${result.crop.name.toLowerCase()} ${result.enabled ? "ativada" : "desativada"}.`);
    if (action === "sell-all-stock") act(engine.sellAll(), result => `${engine.formatNumber(result.sold)} produtos vendidos por ${engine.formatMoney(result.gain)}.`);
    if (action === "expand-storage") act(engine.expandStorage(), result => `Celeiro ampliado em +${result.added} espaços.`);
    if (action === "buy-upgrade") act(engine.buyUpgrade(id), "Infraestrutura aprimorada.");
    if (action === "buy-research") act(engine.buyResearch(id), "Nova etapa da pesquisa concluída.");
    if (action === "buy-prestige-upgrade") act(engine.buyPrestigeUpgrade(id), "Legado permanente aprimorado.");
    if (action === "accept-contract") act(engine.acceptContract(id), result => `Contrato com ${engine.getCompany(result.contract.companyId).name} aceito.`);
    if (action === "decline-contract") act(engine.declineContract(id), result => `Proposta recusada. Uma nova oferta chegará em até ${engine.formatTime(result.cooldownSeconds)}.`);
    if (action === "claim-contract") {
      const result = engine.claimContractReward(id);
      if (!result.ok) return act(result);
      animateResourceReward(button, { coins: result.contract.rewardCoins, research: result.contract.rewardResearch });
      toast(`Recompensa recebida pelo contrato com ${engine.getCompany(result.contract.companyId).name}.`, "success");
      render(true);
    }
    if (action === "deliver-order") {
      const result = engine.deliverOrder(cropId);
      if (!result.ok) return act(result);
      if (result.completed) {
        animateResourceReward(button, result.rewards || { coins: result.order.rewardCoins, research: result.order.rewardResearch });
        toast(`Pedido concluído. Recompensa recebida por ${result.order.crop.name.toLowerCase()}.`, "success");
      } else {
        toast(`${engine.formatNumber(result.delivered)} unidades entregues. O progresso ficou salvo.`, "success");
      }
      render(true);
    }
    if (action === "claim-mission") {
      const result = engine.claimMission(id);
      if (!result.ok) return act(result);
      animateResourceReward(button, result.mission.reward || {});
      toast("Etapa da missão concluída. A próxima etapa da série foi liberada.", "success");
      render(true);
    }
    if (action === "perform-prestige") {
      const gain = engine.getPrestigeEstimate();
      if (engine.state.farmLevel < 15) return toast("O prestígio fica disponível no nível 15 da fazenda.", "error");
      if (gain < 1) return toast("Fortaleça mais esta jornada antes de prestigiar.", "error");
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

    [dom.searchCrop, dom.categoryFilter, dom.stockCategoryFilter].filter(Boolean).forEach(control => {
      control.addEventListener(control.tagName === "INPUT" ? "input" : "change", () => render(true));
    });

    dom.toggleCompletedMissions?.addEventListener("click", () => {
      showCompletedMissions = !showCompletedMissions;
      renderMissions();
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
