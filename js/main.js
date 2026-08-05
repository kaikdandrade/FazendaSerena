"use strict";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const pendingEvents = [];
  let engine = null;
  const soundEngine = new SoundEngine();
  let lastFrame = performance.now();
  let lastRender = 0;
  let lastLiveHeader = 0;
  let lastCropControls = 0;
  let lastSave = 0;
  let activeView = "farmView";
  let activeOfficeTab = "contracts";
  let activeEvolutionTab = "upgrades";
  let showCompletedMissions = false;
  let contractDockCollapsed = false;
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
    completedOrderList: $("#completedOrderList"),
    completedOrderCount: $("#completedOrderCount"),
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
    floatingCoinsCounter: $("#floatingCoinsCounter"),
    floatingResearchCounter: $("#floatingResearchCounter"),
    floatingPrestigeCounter: $("#floatingPrestigeCounter"),
    farmProgress: $(".farm-progress"),
    farmXPTrack: $(".farm-progress .soft-progress"),
    farmLevelLabel: $("#farmLevelLabel"),
    farmXPBar: $("#farmXPBar"),
    farmXPText: $("#farmXPText"),
    stockNavTab: $("#stockNavTab"),
    stockNavBadge: $("#stockNavBadge"),
    officeNavTab: $("#officeNavTab"),
    statsHero: $("#statsHero"),
    lifetimeStats: $("#lifetimeStats"),
    recordStats: $("#recordStats"),
    achievementSummary: $("#achievementSummary"),
    achievementGrid: $("#achievementGrid"),
    ambientSetting: $("#ambientSetting"),
    uiScaleSetting: $("#uiScaleSetting"),
    uiScaleText: $("#uiScaleText"),
    masterVolumeSetting: $("#masterVolumeSetting"),
    masterVolumeText: $("#masterVolumeText"),
    effectVolumeSetting: $("#effectVolumeSetting"),
    effectVolumeText: $("#effectVolumeText"),
    musicVolumeSetting: $("#musicVolumeSetting"),
    musicVolumeText: $("#musicVolumeText"),
    musicTrackSetting: $("#musicTrackSetting"),
    backToTop: $("#backToTop")
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
    coins: "assets/icons/coin.png",
    research: "assets/icons/potion.png",
    prestige: "assets/icons/prestige.png"
  };

  function resourceAmount(type, value, options = {}) {
    const number = Number(value) || 0;
    const label = options.label ? `<small>${escapeHtml(options.label)}</small>` : "";
    const title = options.title ? ` title="${escapeHtml(options.title)}"` : "";
    return `<span class="resource-amount resource-${type}${options.compact ? " compact" : ""}"${title}><img src="${resourceIcons[type]}" alt=""><b>${engine.formatNumber(Math.abs(number))}</b>${label}</span>`;
  }

  function resourceRewards(reward) {
    const parts = [];
    if (reward?.coins) parts.push(resourceAmount("coins", reward.coins, { title: "Moedas" }));
    if (reward?.research) parts.push(resourceAmount("research", reward.research, { title: "Pontos de pesquisa" }));
    if (reward?.prestige) parts.push(resourceAmount("prestige", reward.prestige, { title: "Pontos de prestígio" }));
    return parts.join("");
  }


  function companyIconMarkup(company) {
    const icon = String(company?.icon || "");
    if (/^(?:data:image\/|.*\.(?:png|webp|svg)$)/i.test(icon)) {
      return `<img src="${escapeHtml(icon)}" alt="">`;
    }
    return escapeHtml(icon);
  }

  function enrichResourceText(message) {
    let html = escapeHtml(message);
    const amount = '([+−-]?(?:\\d[\\d.,]*)(?:\\s(?:mil|mi|bi|tri|q))?)';
    const replace = (type, labelPattern) => {
      const expression = new RegExp(`${amount}\\s+(?:${labelPattern})`, "gi");
      html = html.replace(expression, (_, value) => {
        const first = value.trim().charAt(0);
        const signed = ["+", "−", "-"].includes(first);
        const absolute = signed ? value.trim().slice(1) : value.trim();
        return `<span class="inline-resource resource-${type}"><img src="${resourceIcons[type]}" alt=""><b>${absolute}</b></span>`;
      });
    };
    replace("coins", "moedas?");
    replace("research", "(?:pontos? de )?pesquisa");
    replace("prestige", "(?:pontos? de )?prestígio");
    return html;
  }

  function toast(message, type = "") {
    // Revisão 19: notificações visuais são exclusivas para o ganho de nível.
    if (!message || type !== "level") return;
    const item = document.createElement("div");
    item.className = "toast success level-toast";
    item.innerHTML = `<span aria-hidden="true">⬆</span><span>${enrichResourceText(message)}</span>`;
    dom.toastZone.appendChild(item);
    window.setTimeout(() => item.remove(), 3600);
  }

  function handleEngineEvent(event) {
    if (!event) return;
    if (event.type === "level") {
      soundEngine.play("levelUp");
      toast(`A fazenda alcançou o nível ${event.level} e recebeu ${engine.formatMoney(event.rewardCoins || 0)}. Novas sementes podem ter sido liberadas.`, "level");
      window.setTimeout(() => render(true), 0);
    }
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
    dom.categoryFilter.insertAdjacentHTML("beforeend", `<option value="locked">Safras bloqueadas</option>${options}`);
    dom.stockCategoryFilter?.insertAdjacentHTML("beforeend", options);
  }

  function syncScrollUI() {
    const scrolled = window.scrollY > 180;
    document.body.classList.toggle("page-scrolled", scrolled);
    if (dom.backToTop) dom.backToTop.hidden = !scrolled;
  }


  function revealTabHorizontally(container, tab, behavior = "smooth") {
    if (!container || !tab || !window.matchMedia("(max-width: 480px)").matches) return;
    const maximum = Math.max(0, container.scrollWidth - container.clientWidth);
    if (maximum <= 1) return;
    const target = tab.offsetLeft - (container.clientWidth - tab.offsetWidth) / 2;
    container.scrollTo({
      left: Math.max(0, Math.min(maximum, target)),
      behavior
    });
  }

  function setupDragNavigation(container) {
    if (!container || container.dataset.dragNavigationReady === "true") return;
    container.dataset.dragNavigationReady = "true";

    const compactQuery = window.matchMedia("(max-width: 480px)");
    const drag = {
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
      moved: false,
      suppressClickUntil: 0
    };

    const maximumScroll = () => Math.max(0, container.scrollWidth - container.clientWidth);
    const canDrag = () => compactQuery.matches && maximumScroll() > 1 && !container.hidden;

    const refreshScrollableState = () => {
      const scrollable = canDrag();
      container.classList.toggle("is-drag-scrollable", scrollable);
      if (!compactQuery.matches) {
        container.scrollLeft = 0;
        return;
      }
      container.scrollLeft = Math.min(container.scrollLeft, maximumScroll());
    };

    const finishDrag = event => {
      if (drag.pointerId === null) return;
      if (event && container.hasPointerCapture?.(drag.pointerId)) {
        try { container.releasePointerCapture(drag.pointerId); } catch (_) {}
      }
      if (drag.moved) drag.suppressClickUntil = performance.now() + 280;
      drag.pointerId = null;
      drag.moved = false;
      container.classList.remove("is-dragging");
    };

    container.addEventListener("pointerdown", event => {
      if (!canDrag() || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
      drag.pointerId = event.pointerId;
      drag.startX = event.clientX;
      drag.startScrollLeft = container.scrollLeft;
      drag.moved = false;
      try { container.setPointerCapture(event.pointerId); } catch (_) {}
    });

    container.addEventListener("pointermove", event => {
      if (event.pointerId !== drag.pointerId) return;
      const delta = event.clientX - drag.startX;
      if (!drag.moved && Math.abs(delta) >= 5) {
        drag.moved = true;
        container.classList.add("is-dragging");
      }
      if (!drag.moved) return;
      event.preventDefault();
      container.scrollLeft = Math.max(0, Math.min(maximumScroll(), drag.startScrollLeft - delta));
    }, { passive: false });

    container.addEventListener("pointerup", finishDrag);
    container.addEventListener("pointercancel", finishDrag);
    container.addEventListener("lostpointercapture", finishDrag);
    container.addEventListener("dragstart", event => event.preventDefault());
    container.addEventListener("click", event => {
      if (performance.now() >= drag.suppressClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    if (typeof ResizeObserver === "function") {
      new ResizeObserver(refreshScrollableState).observe(container);
    }
    if (typeof MutationObserver === "function") {
      new MutationObserver(refreshScrollableState).observe(container, {
        attributes: true,
        attributeFilter: ["hidden", "class"],
        childList: true,
        subtree: true
      });
    }
    compactQuery.addEventListener?.("change", refreshScrollableState);
    window.addEventListener("resize", refreshScrollableState, { passive: true });
    requestAnimationFrame(refreshScrollableState);
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
    window.requestAnimationFrame(() => {
      const activeTab = dom.tabs.find(tab => tab.dataset.view === activeView);
      revealTabHorizontally(activeTab?.closest(".main-nav"), activeTab);
    });
    dom.contextNavBlocks.forEach(block => {
      const visible = block.dataset.contextFor === activeView;
      block.hidden = !visible;
      block.classList.toggle("active", visible);
    });
    if (updateHash) history.replaceState(null, "", `#${activeView}`);
    window.scrollTo({ top: 0, behavior: "auto" });
    syncScrollUI();
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

    soundEngine.configure(settings);
    if (dom.masterVolumeSetting && document.activeElement !== dom.masterVolumeSetting) dom.masterVolumeSetting.value = String(settings.masterVolume ?? 100);
    if (dom.masterVolumeText) dom.masterVolumeText.textContent = `${settings.masterVolume ?? 100}%`;
    if (dom.effectVolumeSetting && document.activeElement !== dom.effectVolumeSetting) dom.effectVolumeSetting.value = String(settings.effectVolume ?? 55);
    if (dom.effectVolumeText) dom.effectVolumeText.textContent = `${settings.effectVolume ?? 55}%`;
    if (dom.musicVolumeSetting && document.activeElement !== dom.musicVolumeSetting) dom.musicVolumeSetting.value = String(settings.musicVolume ?? 30);
    if (dom.musicVolumeText) dom.musicVolumeText.textContent = `${settings.musicVolume ?? 30}%`;
    if (dom.musicTrackSetting && document.activeElement !== dom.musicTrackSetting) dom.musicTrackSetting.value = SoundEngine.MUSIC_SOURCES[settings.musicTrack] ? settings.musicTrack : "betweenLightAndShadows";
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
    dom.officeNavTab.classList.remove("has-attention");
    const reasons = [];
    if (claimable > 0) reasons.push(`${claimable} recompensa${claimable === 1 ? " pronta" : "s prontas"}`);
    if (readyOrders > 0) reasons.push(`${readyOrders} pedido${readyOrders === 1 ? " pronto" : "s prontos"}`);
    if (readyMissions > 0) reasons.push(`${readyMissions} missão${readyMissions === 1 ? " pronta" : "ões prontas"}`);
    dom.officeNavTab.setAttribute("aria-label", reasons.length ? `Escritório: ${reasons.join(", ")}.` : "Escritório");
    dom.officeNavTab.title = reasons.length ? `Ações prontas: ${reasons.join(", ")}` : "Escritório";
  }

  function updateFarmProgressDisplay() {
    const state = engine.state;
    const maximumLevel = GameEngine.MAX_FARM_LEVEL;
    const atMaximum = state.farmLevel >= maximumLevel;
    const farmNeed = engine.getFarmXPNeed();
    dom.farmLevelLabel.textContent = String(Math.min(maximumLevel, state.farmLevel));
    dom.farmProgress?.classList.toggle("max-level", atMaximum);
    dom.farmXPBar.style.width = atMaximum ? "100%" : `${percent((state.farmXP / farmNeed) * 100)}%`;
    dom.farmXPText.textContent = atMaximum
      ? `${engine.formatNumber(state.farmXP)} XP`
      : `${engine.formatNumber(state.farmXP)} / ${engine.formatNumber(farmNeed)} XP`;
    if (dom.farmXPTrack) {
      dom.farmXPTrack.setAttribute("aria-valuemin", "0");
      dom.farmXPTrack.setAttribute("aria-valuemax", atMaximum ? "100" : String(farmNeed));
      dom.farmXPTrack.setAttribute("aria-valuenow", atMaximum ? "100" : String(Math.floor(state.farmXP)));
      dom.farmXPTrack.setAttribute("aria-label", atMaximum ? `Nível máximo. ${engine.formatNumber(state.farmXP)} XP.` : "Experiência da fazenda");
    }
  }

  function renderHeader() {
    const state = engine.state;
    const coinsText = engine.formatNumber(state.coins);
    const researchText = engine.formatNumber(state.research);
    const prestigeText = engine.formatNumber(state.prestigePoints);
    dom.coinsCounter.textContent = coinsText;
    dom.researchCounter.textContent = researchText;
    dom.prestigeCounter.textContent = prestigeText;
    if (dom.floatingCoinsCounter) dom.floatingCoinsCounter.textContent = coinsText;
    if (dom.floatingResearchCounter) dom.floatingResearchCounter.textContent = researchText;
    if (dom.floatingPrestigeCounter) dom.floatingPrestigeCounter.textContent = prestigeText;
    updateFarmProgressDisplay();

    const metrics = engine.getMetrics();
    updateStockNavigation(metrics);
    const activeContracts = state.activeContracts.length;
    const readyContracts = engine.getReadyContractCount();
    const readyOrders = engine.getReadyOrderCount();
    const readyMissions = engine.getReadyMissionCount();
    updateOfficeNavigation(activeContracts, readyOrders, readyMissions);
    dom.contractTabCount.textContent = String(readyContracts);
    dom.contractTabCount.hidden = readyContracts < 1;
    dom.orderTabCount.textContent = String(readyOrders);
    dom.orderTabCount.hidden = readyOrders < 1;
    dom.missionTabCount.textContent = String(readyMissions);
    dom.missionTabCount.hidden = readyMissions < 1;
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
    const coinsText = engine.formatNumber(state.coins);
    const researchText = engine.formatNumber(state.research);
    const prestigeText = engine.formatNumber(state.prestigePoints);
    dom.coinsCounter.textContent = coinsText;
    dom.researchCounter.textContent = researchText;
    dom.prestigeCounter.textContent = prestigeText;
    if (dom.floatingCoinsCounter) dom.floatingCoinsCounter.textContent = coinsText;
    if (dom.floatingResearchCounter) dom.floatingResearchCounter.textContent = researchText;
    if (dom.floatingPrestigeCounter) dom.floatingPrestigeCounter.textContent = prestigeText;
    updateFarmProgressDisplay();
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
      const directRoute = cropState.autoSell || activeContracts.length > 0;
      const paused = storageRemaining <= 0 && !directRoute;
      const progress = instant ? 100 : percent(cropState.progress * 100);
      const ring = $('[data-crop-ring]', card);
      const progressLabel = $('[data-crop-percent]', card);
      const cycle = $('[data-crop-cycle]', card);

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
      if (progressLabel) {
        progressLabel.hidden = instant;
        if (!instant) progressLabel.textContent = paused ? "Ⅱ" : `${Math.floor(progress)}%`;
      }
      if (cycle) cycle.textContent = instant ? "Contínua" : paused ? "Pausada" : formatLiveTime((1 - cropState.progress) * growthTime);
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
        const button = $('[data-crop-purchase]', card);
        card.classList.toggle("insufficient", unlocked && !canAfford);
        if (button) {
          button.disabled = !unlocked || !canAfford;
          button.innerHTML = !unlocked
            ? `Necessário: Fazenda nível ${crop.unlockLevel}`
            : `Comprar ${resourceAmount("coins", -buyCost, { compact: true })}`;
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
    const cropState = engine.state.crops[cropId];
    if (cropState?.level >= GameEngine.MAX_CROP_LEVEL) return "max";
    return cropUpgradeModes.get(cropId) === "max" ? "max" : "one";
  }

  function getCropUpgradeSelection(cropId) {
    const cropState = engine.state.crops[cropId];
    const mode = getCropUpgradeMode(cropId);
    const maxed = cropState.level >= GameEngine.MAX_CROP_LEVEL;
    const oneCost = maxed ? 0 : engine.getCropUpgradeCost(cropId);
    const affordablePlan = engine.getCropAffordableUpgrades(cropId);
    const levels = mode === "max" ? (maxed ? 0 : Math.max(1, affordablePlan.levels)) : maxed ? 0 : 1;
    const affordable = !maxed && (mode === "max" ? affordablePlan.levels > 0 : engine.state.coins >= oneCost);
    // Sem níveis acessíveis, mostramos o custo do próximo nível em vez de “0”.
    const cost = mode === "max"
      ? (affordablePlan.levels > 0 ? affordablePlan.totalCost : affordablePlan.nextCost)
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
      button.disabled = selection.maxed;
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-disabled", String(selection.maxed));
    });
    const summary = $('[data-crop-upgrade-summary]', card);
    const action = $('[data-crop-upgrade-action]', card);
    if (summary) {
      const upgradeLevels = selection.mode === "max" ? selection.levels : 1;
      summary.innerHTML = `<strong>${selection.maxed ? "Máx." : `+${upgradeLevels}`}</strong>`;
    }
    if (action) {
      action.disabled = selection.maxed || !selection.affordable;
      action.innerHTML = selection.maxed
        ? "Plantação concluída"
        : `Aprimorar ${resourceAmount("coins", -selection.cost, { compact: true })}`;
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
        ? `Necessário: Fazenda nível ${crop.unlockLevel}`
        : `Comprar ${resourceAmount("coins", -buyCost, { compact: true })}`;
      return `
        <article class="crop-card locked ${unlocked && !canAffordPurchase ? "insufficient" : ""}" data-locked-crop="${crop.id}" style="--crop-glow:${getCropGlow(crop.category)}">
          <div class="crop-level-strip locked-level-strip"><span class="crop-level-compact">Nível <strong>0</strong><small>/ ${GameEngine.MAX_CROP_LEVEL}</small></span></div>
          <div class="crop-head">
            <div class="crop-art locked-art"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"></div>
            <div class="crop-info">
              <div class="crop-title-row"><h3>${escapeHtml(crop.name)}</h3></div>
              <div class="crop-meta-row"><span class="crop-category-list">${escapeHtml(category)}</span></div>
            </div>
          </div>
          <button class="button primary full crop-buy-button" type="button" data-action="buy-crop" data-crop="${crop.id}" data-crop-purchase ${unlocked && canAffordPurchase ? "" : "disabled"}>${purchaseLabel}</button>
        </article>`;
    }

    const growthTime = engine.getGrowthTime(crop.id);
    const instant = growthTime <= 0;
    const growthPct = instant ? 100 : percent(data.progress * 100);
    const activeContracts = engine.state.activeContracts.filter(contract => contract.cropId === crop.id && contract.delivered < contract.amount && !contract.completedAt);
    const directRoute = data.autoSell || activeContracts.length > 0;
    const storageFull = engine.getStorageRemaining() <= 0 && !directRoute;
    const speedMaxed = data.level >= engine.getInstantGrowthLevel();
    const cycleLabel = instant ? "Contínua" : storageFull ? "Pausada" : formatLiveTime((1 - data.progress) * growthTime);
    const selection = getCropUpgradeSelection(crop.id);

    return `
      <article class="crop-card ${data.autoSell ? "auto-sell-enabled" : ""}" data-live-crop="${crop.id}" style="--crop-glow:${getCropGlow(crop.category)}">
        <div class="crop-level-strip" ${speedMaxed ? 'title="Velocidade máxima; os níveis restantes continuam valorizando esta cultura"' : ""}>
          <span class="crop-level-compact">Nível <strong>${data.level}</strong><small>/ ${GameEngine.MAX_CROP_LEVEL}</small></span>
        </div>
        <div class="crop-head">
          <div class="crop-art-progress ${storageFull ? "paused" : ""} ${instant ? "instant" : ""}" data-crop-ring data-last-progress="${growthPct}" style="--growth-progress:${growthPct}%" title="Progresso da produção">
            <div class="crop-art"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"></div>
            ${instant ? "" : `<span class="crop-progress-percent" data-crop-percent>${storageFull ? "Ⅱ" : `${Math.floor(growthPct)}%`}</span>`}
          </div>
          <div class="crop-info">
            <div class="crop-title-row"><h3>${escapeHtml(crop.name)}</h3></div>
            <div class="crop-meta-row"><span class="crop-category-list">${escapeHtml(category)}</span></div>
            <div class="crop-quick-stats">
              <span title="Tempo restante"><i>◷</i><b data-crop-cycle>${cycleLabel}</b></span>
            </div>
          </div>
        </div>
        <div class="crop-upgrade-panel crop-upgrade-redesign">
          <div class="upgrade-mode-selector" role="group" aria-label="Quantidade de aprimoramentos">
            <button class="upgrade-mode-option ${selection.mode === "one" ? "active" : ""}" type="button" data-action="select-upgrade-mode" data-upgrade-mode="one" data-crop="${crop.id}" aria-pressed="${selection.mode === "one"}" ${selection.maxed ? 'disabled aria-disabled="true"' : ""}>+1</button>
            <button class="upgrade-mode-option ${selection.mode === "max" ? "active" : ""}" type="button" data-action="select-upgrade-mode" data-upgrade-mode="max" data-crop="${crop.id}" aria-pressed="${selection.mode === "max"}" ${selection.maxed ? 'disabled aria-disabled="true"' : ""}>Max</button>
          </div>
          <div class="crop-upgrade-summary" data-crop-upgrade-summary><strong>${selection.maxed ? "Máx." : `+${selection.mode === "max" ? selection.levels : 1}`}</strong></div>
          <button class="button primary full crop-upgrade-cta" type="button" data-action="upgrade-crop-selected" data-crop="${crop.id}" data-crop-upgrade-action ${selection.maxed || !selection.affordable ? "disabled" : ""}>${selection.maxed ? "Plantação concluída" : `Aprimorar ${resourceAmount("coins", -selection.cost, { compact: true })}`}</button>
        </div>
      </article>`;
  }

  function renderCrops() {
    const term = normalize(dom.searchCrop.value);
    const category = dom.categoryFilter.value;
    const visibleUnlockLevel = engine.state.farmLevel + 1;
    const list = engine.data.crops.filter(crop => {
      const cropState = engine.state.crops[crop.id];
      const categoryName = engine.data.categories[crop.category];
      const visibleByProgress = cropState.owned || crop.unlockLevel <= visibleUnlockLevel;
      const matchesCategory = category === "locked"
        ? !cropState.owned && crop.unlockLevel <= engine.state.farmLevel
        : category === "all" || crop.category === category;
      return visibleByProgress && matchesCategory && (!term || normalize(`${crop.name} ${categoryName}`).includes(term));
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

    const allAutoSellEnabled = allOwned.length > 0 && allOwned.every(crop => engine.state.crops[crop.id].autoSell);
    const enabledAutoSellCount = allOwned.filter(crop => engine.state.crops[crop.id].autoSell).length;

    dom.stockSummary.innerHTML = `
      <article class="summary-card storage-capacity-card normalized-summary-card">
        <div class="summary-card-heading"><div><small>Estoque compartilhado</small><strong>${engine.formatNumber(storageUsed)} / ${engine.formatNumber(totalCapacity)}</strong></div><span class="summary-status ${storagePct >= 100 ? "full" : ""}">${storagePct >= 100 ? "Cheio" : "Capacidade"}</span></div>
        <div class="progress-track growth"><span style="width:${Math.min(100, storagePct)}%"></span></div>
        <button class="button primary full storage-expand-button" type="button" data-action="expand-storage" ${canExpandStorage ? "" : "disabled"}>+100 espaços de armazenamento ${resourceAmount("coins", -expansionCost, { compact: true })}</button>
      </article>
      <article class="summary-card stock-sale-summary normalized-summary-card">
        <div class="summary-card-heading"><div><small>Venda geral</small><strong>${engine.formatNumber(storageUsed)} itens</strong></div><span class="summary-status">Mercado</span></div>
        <p>Venda todo o conteúdo armazenado de uma só vez.</p>
        <button class="button primary full" type="button" data-action="sell-all-stock" ${storageUsed <= 0 ? "disabled" : ""}>${storageUsed > 0 ? `Vender estoque ${resourceAmount("coins", totalValue, { compact: true })}` : "Estoque vazio"}</button>
      </article>
      <article class="summary-card stock-auto-summary normalized-summary-card">
        <div class="summary-card-heading"><div><small>Venda automática geral</small><strong>${enabledAutoSellCount} / ${allOwned.length} ativas</strong></div><span class="summary-status">Automação</span></div>
        <p>Ative ou desative a venda automática de todas as culturas compradas.</p>
        <button class="auto-sell-toggle global-auto-sell-toggle ${allAutoSellEnabled ? "active" : ""}" type="button" data-action="toggle-all-auto-sell" aria-pressed="${String(allAutoSellEnabled)}" ${allOwned.length ? "" : "disabled"}><span><strong>${allAutoSellEnabled ? "Desativar todas" : "Ativar todas"}</strong><small>${allAutoSellEnabled ? "Todas as vendas estão ativas" : enabledAutoSellCount ? "Ativar as vendas restantes" : "Nenhuma venda automática ativa"}</small></span><span class="auto-sell-switch"><i></i></span></button>
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
      const priorityText = activeContracts ? `${activeContracts} contrato${activeContracts === 1 ? " ativo" : "s ativos"}` : "";
      return `
        <article class="stock-card normalized-stock-card ${data.autoSell ? "auto-sell-card" : ""}">
          <div class="stock-head"><div class="stock-ident"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"><div><h3>${escapeHtml(crop.name)}</h3><small>${escapeHtml(engine.data.categories[crop.category])}</small></div></div></div>
          <div class="stock-value-grid"><div><small>Quantidade</small><strong>${engine.formatNumber(data.stock)} <span>un.</span></strong></div><div><small>Valor unitário</small><strong>${resourceAmount("coins", price, { compact: true })}</strong></div><div><small>Valor guardado</small><strong>${resourceAmount("coins", data.stock * price, { compact: true })}</strong></div></div>
          <button class="auto-sell-toggle compact-auto-toggle ${data.autoSell ? "active" : ""}" type="button" data-action="toggle-auto-sell" data-crop="${crop.id}" aria-pressed="${String(data.autoSell)}"><span><strong>Venda automática</strong><small>${data.autoSell ? "Ativada" : "Desativada"}</small></span><span class="auto-sell-switch"><i></i></span></button>
          ${priorityText ? `<div class="stock-priority-note"><strong>${escapeHtml(priorityText)}</strong><small>Contratos têm prioridade; depois vem a venda automática e, por último, o estoque.</small></div>` : ""}
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
    const isRoyalTreasury = kind === "prestige" && item.id === "royalTreasury";
    const iconMarkup = typeof item.icon === "string" && /^(?:data:image\/|.*\.(?:png|webp|svg)$)/i.test(item.icon)
      ? `<img src="${escapeHtml(item.icon)}" alt="">`
      : escapeHtml(item.icon);
    const treasuryAmount = 2000 + Math.min(level, 9) * 2000;
    const descriptionHtml = isRoyalTreasury
      ? `<span class="treasury-current-value">${resourceAmount("coins", treasuryAmount, { compact: true })}<span>ao começar uma nova jornada.</span></span>${level < 9
        ? `<span class="treasury-next-value">Próximo nível: ${resourceAmount("coins", 2000, { compact: true })} adicionais.</span>`
        : level < item.max
          ? `<span class="treasury-next-value">O último nível consolida este valor como máximo.</span>`
          : `<span class="treasury-next-value">Valor inicial máximo consolidado.</span>`}`
      : enrichResourceText(item.desc);
    return `
      <article class="upgrade-card normalized-upgrade-card redesigned-evolution-card ${maxed ? "evolution-upgrade-completed" : ""}" data-upgrade-kind="${kind}" data-upgrade-completed="${String(maxed)}">
        <div class="upgrade-level-badge">${maxed ? "Nível máximo" : `Nível ${level} / ${item.max}`}</div>
        <div class="upgrade-card-identity">
          <span class="upgrade-icon" aria-hidden="true">${iconMarkup}</span>
          <h3>${escapeHtml(item.name)}</h3>
        </div>
        <p class="upgrade-description ${isRoyalTreasury ? "treasury-description" : ""}">${descriptionHtml}</p>
        <button class="button ${kind === "prestige" ? "gold" : "primary"} full" type="button" data-action="${action}" data-id="${item.id}" ${maxed || !affordable ? "disabled" : ""}>${maxed ? "Concluído" : `Aprimorar ${resourceAmount(resourceType, -cost, { compact: true })}`}</button>
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
      { label: "Nível da fazenda", value: `${engine.state.farmLevel}`, ready: prestigeUnlocked },
      { label: "Moedas desta jornada", value: resourceAmount("coins", engine.state.stats.runCoinsEarned), ready: engine.state.stats.runCoinsEarned > 0 },
      { label: "Culturas compradas", value: `${metrics.owned} / ${engine.data.crops.length}`, ready: metrics.owned > 0 },
      { label: "Contratos concluídos", value: engine.state.stats.contractsCompleted, ready: engine.state.stats.contractsCompleted > 0 }
    ];
    dom.prestigeDashboard.innerHTML = `
      <section class="prestige-overview-card normalized-prestige-card ${!prestigeUnlocked ? "prestige-locked" : ""}">
        <div class="prestige-copy"><p class="eyebrow">novo ciclo</p><h2>${prestigeUnlocked ? "Transforme esta jornada em legado" : "Prestígio desbloqueia no nível 15"}</h2><p>${prestigeUnlocked ? "O cálculo usa somente o progresso renovável desta jornada." : `Continue evoluindo a fazenda. Faltam ${Math.max(0, 15 - engine.state.farmLevel)} níveis para liberar o prestígio.`}</p></div>
        <div class="prestige-gain-card"><small>Ganho estimado</small><strong>${resourceAmount("prestige", gain)}</strong><span>${prestigeUnlocked ? (engine.state.permanentBonuses.prestigeDouble ? "Bônus permanente 2× ativo" : "Aumente a jornada para ganhar mais") : "Desbloqueia no nível 15"}</span></div>
      </section>
      <section class="prestige-requirements normalized-prestige-requirements"><div class="prestige-requirements-head"><div><small>Requisitos da jornada</small><h3>Progresso que será convertido</h3></div><span>${prestigeUnlocked && gain > 0 ? "Pronto" : "Em progresso"}</span></div><div class="prestige-driver-grid">${drivers.map(item => `<article class="${item.ready ? "ready" : ""}"><div><small>${item.label}</small><strong>${item.value}</strong></div></article>`).join("")}</div></section>
      <section class="prestige-action-card"><div><strong>Ao prestigiar</strong><p>Moedas, pesquisa, nível, culturas, estoque, evoluções, contratos e pedidos da jornada serão reiniciados.</p></div><button class="button gold" type="button" data-action="perform-prestige" ${!prestigeUnlocked || gain < 1 ? "disabled" : ""}>${!prestigeUnlocked ? "Desbloqueia no nível 15" : gain < 1 ? "Ganho insuficiente" : `Prestigiar ${resourceAmount("prestige", gain, { compact: true })}`}</button></section>`;
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
      dom.contractDock.classList.remove("visible", "collapsed");
      dom.contractDock.innerHTML = "";
      return;
    }
    dom.contractDock.classList.add("visible");
    dom.contractDock.classList.toggle("collapsed", contractDockCollapsed);
    const toggleLabel = contractDockCollapsed ? "Expandir acompanhamento de contratos" : "Recolher acompanhamento de contratos";
    const toggleIcon = `<img src="assets/icons/contract-dock-arrow.png" alt="">`;
    if (contractDockCollapsed) {
      dom.contractDock.innerHTML = `<button class="contract-dock-collapse-toggle" type="button" data-action="toggle-contract-dock" aria-expanded="false" aria-label="${toggleLabel}" title="${toggleLabel}"><span aria-hidden="true">${toggleIcon}</span></button>`;
      return;
    }
    dom.contractDock.innerHTML = `
      <button class="contract-dock-collapse-toggle" type="button" data-action="toggle-contract-dock" aria-expanded="true" aria-label="${toggleLabel}" title="${toggleLabel}"><span aria-hidden="true">${toggleIcon}</span></button>
      <div class="contract-dock-panel">
        <button class="contract-dock-title" type="button" data-go-office-contracts><strong>Contratos</strong><small>${contracts.length}/${GameEngine.MAX_ACTIVE_CONTRACTS}</small></button>
        <div class="contract-dock-list">
          ${contracts.map(contract => {
            const crop = engine.getCrop(contract.cropId);
            const company = engine.getCompany(contract.companyId);
            const progress = engine.getContractProgress(contract);
            const urgent = !progress.completed && contract.timeRemaining <= 30;
            const actionAttributes = progress.completed
              ? `data-action="claim-contract" data-id="${contract.id}" title="Receber recompensa"`
              : 'data-go-office-contracts title="Abrir contratos"';
            return `<button class="contract-dock-item ${urgent ? "deadline-warning" : ""} ${progress.completed ? "reward-ready" : ""}" type="button" ${actionAttributes}>
              <img src="${crop.image}" alt="${escapeHtml(crop.name)}">
              <span class="contract-dock-copy"><small>${escapeHtml(company.name)}</small><strong>${escapeHtml(crop.name)}</strong><i><b class="delivered" style="width:${percent(progress.percent)}%"></b></i><u>${progress.completed ? "Clique para receber" : `${engine.formatTime(contract.timeRemaining)} restantes`}</u><span class="contract-dock-rewards">${resourceRewards({ coins: contract.rewardCoins, research: contract.rewardResearch })}</span></span>
              <em class="${progress.completed ? "ready" : ""}">${Math.floor(progress.percent)}%<small>${progress.completed ? "receber" : "entregue"}</small></em>
            </button>`;
          }).join("")}
        </div>
      </div>`;
  }

  function renderContracts() {
    const eligible = engine.getContractEligibleCrops();
    if (!eligible.length) {
      dom.activeContractList.innerHTML = "";
      dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">Evolua a fazenda para liberar culturas e receber oportunidades comerciais.</div>`;
      return;
    }

    engine.ensureContractOffers();
    const active = engine.state.activeContracts;
    const offers = engine.state.contractOffers;
    const cooldowns = engine.state.contractCooldowns || [];
    const openSlots = Math.max(0, GameEngine.MAX_ACTIVE_CONTRACTS - active.length);
    const rewardsLine = contract => `<div class="contract-reward-unified"><span>Recompensa</span><strong class="resource-reward-group">${resourceRewards({ coins: contract.rewardCoins, research: contract.rewardResearch })}</strong></div>`;

    dom.activeContractList.innerHTML = active.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const difficulty = engine.getContractDifficulty(contract.difficulty);
      const progress = engine.getContractProgress(contract);
      const urgent = !progress.completed && contract.timeRemaining <= 30;
      if (progress.completed) {
        const toneClass = contract.difficulty === "urgent" ? "contract-tone-urgent" : contract.difficulty === "bulk" ? "contract-tone-bulk" : "contract-tone-normal";
        return `<article class="contract-card active-contract-card contract-completed-card friendly-contract-card ${toneClass}">
          <div class="friendly-contract-top"><div class="contract-company-mark"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.name)}</small><strong>Entrega concluída</strong></div></div><span class="contract-ready-mark">✓ Pronta</span></div>
          <div class="contract-product-focus"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>${engine.formatNumber(contract.amount)} unidades</small><h3>${escapeHtml(crop.name)}</h3></div></div>
          ${rewardsLine(contract)}
          <button class="button gold full reward-claim-button" type="button" data-action="claim-contract" data-id="${contract.id}">Receber recompensa</button>
        </article>`;
      }
      const toneClass = contract.difficulty === "urgent" ? "contract-tone-urgent" : contract.difficulty === "bulk" ? "contract-tone-bulk" : "contract-tone-normal";
      return `<article class="contract-card active-contract-card friendly-contract-card ${toneClass} ${urgent ? "contract-deadline-warning" : ""}">
        <div class="friendly-contract-top"><div class="contract-company-mark"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.name)}</small><strong>Contrato assinado</strong></div></div><span class="contract-clock-badge ${urgent ? "urgent" : ""}">⏱ ${engine.formatTime(contract.timeRemaining)}</span></div>
        <div class="contract-product-focus"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Meta de entrega</small><h3>${engine.formatNumber(contract.amount)} ${escapeHtml(crop.name.toLowerCase())}</h3></div></div>
        <div class="contract-progress-block"><div class="progress-label"><span>Produção enviada</span><strong>${engine.formatNumber(progress.delivered)} / ${engine.formatNumber(contract.amount)}</strong></div><div class="progress-track contract-progress-track"><span class="contract-delivered" style="width:${percent(progress.percent)}%"></span></div></div>
        ${rewardsLine(contract)}
      </article>`;
    }).join("");

    const offerCards = offers.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const toneClass = contract.difficulty === "urgent" ? "contract-tone-urgent" : contract.difficulty === "bulk" ? "contract-tone-bulk" : "contract-tone-normal";
      return `<article class="contract-card contract-offer-card friendly-contract-card ${toneClass}">
        <div class="friendly-contract-top"><div class="contract-company-mark"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.specialty)}</small><strong>${escapeHtml(company.name)}</strong></div></div><span class="contract-clock-badge">⏱ ${engine.formatTime(contract.durationSeconds)}</span></div>
        <div class="contract-product-focus"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><h3>${engine.formatNumber(contract.amount)} ${escapeHtml(crop.name.toLowerCase())}</h3></div></div>
        ${rewardsLine(contract)}
        <div class="contract-offer-actions"><button class="button secondary" type="button" data-action="decline-contract" data-id="${contract.id}">Recusar</button><button class="button primary" type="button" data-action="accept-contract" data-id="${contract.id}" ${openSlots < 1 ? "disabled" : ""}>${openSlots < 1 ? "Limite atingido" : "Assinar"}</button></div>
      </article>`;
    });

    const cooldownCards = cooldowns.map(item => {
      const seconds = Math.max(0, Math.ceil((item.availableAt - Date.now()) / 1000));
      const progress = percent((1 - seconds / Math.max(1, item.durationSeconds)) * 100);
      return `<article class="contract-card contract-cooldown-card friendly-contract-card" aria-live="polite"><div class="cooldown-friendly"><span>🔄</span><div><small>Contato renovando</small><h3>Nova oportunidade em ${engine.formatTime(seconds)}</h3></div></div><div class="progress-track"><span style="width:${progress}%"></span></div></article>`;
    });
    dom.contractOfferList.innerHTML = [...offerCards, ...cooldownCards].join("");
  }

  function renderOrders() {
    const owned = engine.getOwnedCrops();
    if (!owned.length) {
      dom.orderList.innerHTML = `<div class="empty-state office-empty">Compre uma cultura para iniciar sua primeira sequência de pedidos.</div>`;
      dom.completedOrderList.innerHTML = `<div class="empty-state compact-order-empty">Nenhum pedido finalizado ainda.</div>`;
      if (dom.completedOrderCount) dom.completedOrderCount.textContent = "Nenhum pedido finalizado ainda.";
      return;
    }

    const completedCrops = owned.filter(crop => engine.getOrder(crop.id)?.complete);
    const activeCrops = owned
      .filter(crop => !engine.getOrder(crop.id)?.complete)
      .sort((cropA, cropB) => {
        const orderA = engine.getOrder(cropA.id);
        const orderB = engine.getOrder(cropB.id);
        const stockA = Math.max(0, Number(engine.state.crops[cropA.id]?.stock) || 0);
        const stockB = Math.max(0, Number(engine.state.crops[cropB.id]?.stock) || 0);
        const readyA = stockA >= orderA.amount;
        const readyB = stockB >= orderB.amount;
        if (readyA !== readyB) return readyA ? -1 : 1;
        const progressA = stockA / Math.max(1, orderA.amount);
        const progressB = stockB / Math.max(1, orderB.amount);
        if (progressA !== progressB) return progressB - progressA;
        return (Number(cropA.unlockLevel) || 0) - (Number(cropB.unlockLevel) || 0);
      });
    dom.orderList.innerHTML = activeCrops.map(crop => {
      const order = engine.getOrder(crop.id);
      const stock = Math.max(0, Number(engine.state.crops[crop.id].stock) || 0);
      const available = Math.min(stock, order.amount);
      const progress = percent((available / order.amount) * 100);
      const canDeliver = stock >= order.amount;
      return `<article class="order-card normalized-order-card ${canDeliver ? "order-ready-to-deliver" : ""}">
        <div class="order-head"><div class="contract-crop"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Etapa ${order.tier + 1} de ${order.totalTiers}</small><h3>${escapeHtml(crop.name)}</h3></div></div></div>
        <p>${canDeliver ? "Lote completo disponível no estoque. Entregue para receber a recompensa." : `Reúna ${engine.formatNumber(order.amount)} unidades no estoque. Faltam ${engine.formatNumber(order.remaining)}.`}</p>
        <div class="order-progress"><div class="progress-label"><span>Disponível no estoque</span><strong>${engine.formatNumber(available)} / ${engine.formatNumber(order.amount)}</strong></div><div class="progress-track growth"><span style="width:${progress}%"></span></div></div>
        <div class="contract-reward-unified"><span>Recompensa</span><strong class="resource-reward-group">${resourceRewards({ coins: order.rewardCoins, research: order.rewardResearch })}</strong></div>
        <button class="button ${canDeliver ? "primary" : "secondary"} full" type="button" data-action="deliver-order" data-crop="${crop.id}" ${canDeliver ? "" : "disabled"}>Entregar pedido</button>
      </article>`;
    }).join("") || `<div class="empty-state office-empty">Todas as séries de pedidos foram concluídas.</div>`;

    dom.completedOrderList.innerHTML = completedCrops.map(crop => {
      const category = engine.data.categories[crop.category];
      return `<article class="order-card order-complete compact-completed-order">
        <div class="completed-order-identity"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Série completa</small><h3>${escapeHtml(crop.name)}</h3><p>${escapeHtml(category)}</p></div></div>
        <strong class="completed-order-status">Pedido finalizado</strong>
      </article>`;
    }).join("") || `<div class="empty-state compact-order-empty">Nenhum pedido finalizado ainda.</div>`;

    if (dom.completedOrderCount) dom.completedOrderCount.textContent = completedCrops.length
      ? `${completedCrops.length} ${completedCrops.length === 1 ? "cultura finalizou" : "culturas finalizaram"} todos os pedidos.`
      : "Nenhum pedido finalizado ainda.";
  }

  function rewardHtml(reward) {
    const parts = [];
    const resources = resourceRewards(reward);
    if (resources) parts.push(resources);
    if (reward.permanent === "prestigeDouble") parts.push('<span class="permanent-reward">2× pontos nos próximos prestígios</span>');
    return parts.join("");
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
        <div class="mission-head"><div><span class="mission-stage-label">Etapa ${stage} de ${seriesMissions.length}</span><h3>${escapeHtml(mission.title)}</h3><p>${escapeHtml(mission.desc)}</p></div></div>
        <div class="mission-progress"><div class="progress-label"><span>Progresso acumulado</span><strong>${engine.formatNumber(Math.min(value, mission.target))} / ${engine.formatNumber(mission.target)}</strong></div><div class="progress-track growth"><span style="width:${progress}%"></span></div></div>
        <div class="mission-reward"><span>Recompensa</span><strong class="resource-reward-group">${rewardHtml(mission.reward)}</strong></div>
        ${claimed ? `<div class="mission-claimed-mark">✓ Recompensa recebida</div>` : `<button class="button ${completed ? "primary" : "secondary"} full" type="button" data-action="claim-mission" data-id="${mission.id}" ${completed ? "" : "disabled"}>Receber recompensa</button>`}
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
      if (level > 0) {
        const legacyIcon = typeof item.icon === "string" && /\.(?:png|webp|svg)$/i.test(item.icon)
          ? `<img src="${escapeHtml(item.icon)}" alt="">`
          : escapeHtml(item.icon);
        permanentAchievements.push(`<article class="achievement-card legacy-achievement"><span>${legacyIcon}</span><div><small>Legado permanente · nível ${level}/${item.max}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.desc)}</p></div></article>`);
      }
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

  function getActionSound(action) {
    if (["upgrade-crop-selected", "buy-upgrade", "buy-research", "buy-prestige-upgrade"].includes(action)) return "upgrade";
    if (["sell-fraction", "sell-all-stock"].includes(action)) return "sell";
    if (["claim-contract", "deliver-order", "claim-mission"].includes(action)) return "reward";
    if (action === "perform-prestige") return "prestige";
    return "click";
  }

  function handleAction(button) {
    const action = button.dataset.action;
    const cropId = button.dataset.crop;
    const id = button.dataset.id;

    if (action !== "perform-prestige") soundEngine.play(getActionSound(action));

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
    if (action === "toggle-all-auto-sell") {
      const owned = engine.data.crops.filter(crop => engine.state.crops[crop.id]?.owned);
      const allEnabled = owned.length > 0 && owned.every(crop => engine.state.crops[crop.id].autoSell);
      act(engine.setAllAutoSell(!allEnabled), result => `Venda automática ${result.enabled ? "ativada" : "desativada"} para ${result.count} cultura${result.count === 1 ? "" : "s"}.`);
    }
    if (action === "sell-all-stock") act(engine.sellAll(), result => `${engine.formatNumber(result.sold)} produtos vendidos por ${engine.formatMoney(result.gain)}.`);
    if (action === "expand-storage") act(engine.expandStorage(), result => `Celeiro ampliado em +${result.added} espaços.`);
    if (action === "buy-upgrade") act(engine.buyUpgrade(id), "Infraestrutura aprimorada.");
    if (action === "buy-research") act(engine.buyResearch(id), "Nova etapa da pesquisa concluída.");
    if (action === "buy-prestige-upgrade") act(engine.buyPrestigeUpgrade(id), "Legado permanente aprimorado.");
    if (action === "accept-contract") act(engine.acceptContract(id), result => `Contrato com ${engine.getCompany(result.contract.companyId).name} assinado.`);
    if (action === "decline-contract") act(engine.declineContract(id), result => `Contrato recusado. Uma nova oportunidade chegará em até ${engine.formatTime(result.cooldownSeconds)}.`);
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
      animateResourceReward(button, result.rewards || {});
      toast(result.seriesComplete
        ? `Todos os pedidos de ${result.order.crop.name.toLowerCase()} foram finalizados.`
        : `Pedido entregue e recompensa recebida. A próxima etapa de ${result.order.crop.name.toLowerCase()} foi liberada.`, "success");
      render(true);
    }
    if (action === "toggle-contract-dock") {
      contractDockCollapsed = !contractDockCollapsed;
      renderContractDock();
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
      const result = engine.performPrestige();
      if (result.ok) soundEngine.play("prestige");
      act(result, value => `Nova jornada iniciada com ${value.gain} ${value.gain === 1 ? "ponto de prestígio" : "pontos de prestígio"}.`);
    }
  }

  function setupEvents() {
    setupDragNavigation(document.querySelector(".main-nav"));
    dom.contextNavBlocks.forEach(setupDragNavigation);
    dom.tabs.forEach(tab => tab.addEventListener("click", () => {
      soundEngine.playNavigation();
      showView(tab.dataset.view);
    }));
    dom.officeTabs.forEach(tab => tab.addEventListener("click", () => {
      soundEngine.playNavigation();
      showOfficeTab(tab.dataset.officeTab);
      window.requestAnimationFrame(() => revealTabHorizontally(tab.closest(".context-nav-column"), tab));
      render(true);
    }));
    dom.evolutionTabs.forEach(tab => tab.addEventListener("click", () => {
      soundEngine.playNavigation();
      showEvolutionTab(tab.dataset.evolutionTab);
      window.requestAnimationFrame(() => revealTabHorizontally(tab.closest(".context-nav-column"), tab));
      render(true);
    }));
    $$('[data-go-view]').forEach(link => link.addEventListener("click", event => {
      event.preventDefault();
      soundEngine.playNavigation();
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

    dom.masterVolumeSetting?.addEventListener("input", () => {
      engine.setSetting("masterVolume", Number(dom.masterVolumeSetting.value));
      applySettings();
    });
    dom.effectVolumeSetting?.addEventListener("input", () => {
      engine.setSetting("effectVolume", Number(dom.effectVolumeSetting.value));
      applySettings();
    });
    dom.musicVolumeSetting?.addEventListener("input", () => {
      engine.setSetting("musicVolume", Number(dom.musicVolumeSetting.value));
      applySettings();
    });
    dom.musicTrackSetting?.addEventListener("change", () => {
      engine.setSetting("musicTrack", dom.musicTrackSetting.value);
      applySettings();
    });

    document.addEventListener("click", event => {
      const control = event.target.closest("button, a.brand");
      if (!control || control.disabled) return;
      if (control.matches("[data-action], .nav-tab, .office-tab, .evolution-tab, [data-go-view]")) return;
      soundEngine.play("click");
    }, true);

    const unlockMusic = () => soundEngine.resumeMusic();
    document.addEventListener("pointerdown", unlockMusic, { once: true, passive: true });
    document.addEventListener("keydown", unlockMusic, { once: true });

    window.addEventListener("scroll", syncScrollUI, { passive: true });
    dom.backToTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    syncScrollUI();

    window.addEventListener("beforeunload", () => engine.save());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        engine.save();
        soundEngine.pauseMusic();
      } else {
        soundEngine.resumeMusic();
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
