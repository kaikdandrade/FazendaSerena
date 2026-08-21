"use strict";
  function setupCategoryFilter() {
    if (dom.categoryFilter) dom.categoryFilter.innerHTML = '<option value="all">Todas as categorias</option>';
    if (dom.stockCategoryFilter) dom.stockCategoryFilter.innerHTML = '<option value="all">Todas as categorias</option>';
    const options = Object.entries(engine.data.categories)
      .map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`)
      .join("");
    dom.categoryFilter.insertAdjacentHTML("beforeend", `<option value="locked">Safras bloqueadas</option>${options}`);
    dom.stockCategoryFilter?.insertAdjacentHTML("beforeend", options);
  }

  let scrollUiFrame = 0;
  let floatingCountersVisible = false;

  function syncScrollUI() {
    if (scrollUiFrame) return;

    scrollUiFrame = window.requestAnimationFrame(() => {
      const scrollTop = Math.max(0, window.scrollY || document.scrollingElement?.scrollTop || document.documentElement.scrollTop || document.body.scrollTop || 0);
      const sourceStrip = document.querySelector(".app-header > .resource-strip:not(.floating-resource-strip)");

      if (sourceStrip) {
        const sourceBottom = sourceStrip.getBoundingClientRect().bottom;

        // Histerese: o painel aparece somente depois que os counters originais
        // saem por completo da tela e só desaparece quando eles voltam a entrar.
        // Isso impede a alternância contínua da classe durante a rolagem.
        if (!floatingCountersVisible && sourceBottom <= 0) {
          floatingCountersVisible = true;
        } else if (floatingCountersVisible && sourceBottom >= 18) {
          floatingCountersVisible = false;
        }
      } else {
        floatingCountersVisible = scrollTop > 220;
      }

      document.body.classList.toggle("page-scrolled", floatingCountersVisible);
      if (dom.backToTop) dom.backToTop.hidden = scrollTop <= 180;
      scrollUiFrame = 0;
    });
  }


  function revealTabHorizontally(container, tab, behavior = "smooth") {
    if (!container || !tab || container.scrollWidth <= container.clientWidth) return;
    const target = tab.offsetLeft - (container.clientWidth - tab.offsetWidth) / 2;
    const maximum = Math.max(0, container.scrollWidth - container.clientWidth);
    container.scrollTo({ left: Math.max(0, Math.min(maximum, target)), behavior });
  }

  function setupDragNavigation(container) {
    if (!container || container.dataset.dragNavigationReady === "true") return;
    container.dataset.dragNavigationReady = "true";

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let moved = false;
    let horizontalGesture = false;
    let suppressClickUntil = 0;

    const hasHorizontalOverflow = () => container.scrollWidth > container.clientWidth + 1;

    const resetPointer = () => {
      pointerId = null;
      moved = false;
      horizontalGesture = false;
      container.classList.remove("is-dragging");
    };

    const finishDrag = event => {
      if (pointerId === null) return;
      if (event?.pointerId !== undefined && event.pointerId !== pointerId) return;

      const activePointerId = pointerId;
      if (moved) suppressClickUntil = performance.now() + 420;
      if (container.hasPointerCapture?.(activePointerId)) {
        try { container.releasePointerCapture(activePointerId); } catch (_) {}
      }
      resetPointer();
    };

    container.addEventListener("scroll", () => {
      navigationScrollActiveUntil = performance.now() + 180;
    }, { passive: true });

    container.addEventListener("pointerdown", event => {
      // Toque e caneta usam a rolagem horizontal nativa do navegador, com
      // inércia e aceleração próprias. O arraste manual fica apenas no mouse.
      if (event.pointerType === "touch" || event.pointerType === "pen") return;
      if (event.button !== 0) return;
      if (!hasHorizontalOverflow()) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startScrollLeft = container.scrollLeft;
      moved = false;
      horizontalGesture = false;
    }, { passive: true });

    container.addEventListener("pointermove", event => {
      if (event.pointerId !== pointerId) return;

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      if (!horizontalGesture && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= 6) {
        if (Math.abs(deltaY) >= Math.abs(deltaX)) {
          resetPointer();
          return;
        }

        horizontalGesture = true;
        moved = true;
        container.classList.add("is-dragging");
        try { container.setPointerCapture(pointerId); } catch (_) {}
      }

      if (!horizontalGesture || !hasHorizontalOverflow()) return;
      container.scrollLeft = startScrollLeft - deltaX;
      event.preventDefault();
    }, { passive: false });

    container.addEventListener("pointerup", finishDrag);
    container.addEventListener("pointercancel", finishDrag);
    container.addEventListener("lostpointercapture", finishDrag);
    container.addEventListener("click", event => {
      if (performance.now() >= suppressClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }


  function navigateFromResourceCounter(type) {
    const resource = String(type || "");
    if (resource === "coins") {
      showView("farmView");
      return;
    }
    if (resource !== "research" && resource !== "prestige") return;
    showView("officeView");
    showOfficeTab("evolutions");
    render(true);
    window.requestAnimationFrame(() => {
      const target = resource === "prestige" ? dom.prestigeList : dom.researchList;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function showView(viewId, updateHash = true) {
    const requestedView = dom.views.some(view => view.id === viewId) ? viewId : "farmView";
    activeView = requestedView;
    dom.views.forEach(view => view.classList.toggle("active", view.id === activeView));
    dom.tabs.forEach(tab => {
      const sameView = tab.dataset.view === activeView;
      const active = sameView
        && (!tab.dataset.officeTab || tab.dataset.officeTab === activeOfficeTab)
        && (!tab.dataset.profileTab || tab.dataset.profileTab === activeProfileTab);
      tab.classList.toggle("active", active);
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    window.requestAnimationFrame(() => {
      const activeTab = dom.tabs.find(tab => tab.classList.contains("active"));
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

  function applySettings(force = false) {
    const settings = engine.state.settings;
    const ambient = settings.ambient ?? experienceDefaults.ambient;
    const fontScale = settings.fontScale ?? experienceDefaults.fontScale;
    const numberFormat = ["brazilian", "international"].includes(settings.numberFormat)
      ? settings.numberFormat
      : experienceDefaults.numberFormat;
    const masterVolume = settings.masterVolume ?? audioDefaults.masterVolume;
    const effectVolume = settings.effectVolume ?? audioDefaults.effectVolume;
    const musicVolume = settings.musicVolume ?? audioDefaults.musicVolume;
    const musicTrack = SoundEngine.MUSIC_SOURCES[settings.musicTrack]
      ? settings.musicTrack
      : audioDefaults.musicTrack;
    const navigationMode = ["automatic", "line", "grid"].includes(settings.navigationMode) ? settings.navigationMode : "automatic";
    const signature = JSON.stringify({ ambient: Boolean(ambient), fontScale, numberFormat, navigationMode, masterVolume, effectVolume, musicVolume, musicTrack });
    if (!force && signature === appliedSettingsSignature) return;
    appliedSettingsSignature = signature;

    document.body.dataset.ambient = String(Boolean(ambient));
    document.documentElement.style.setProperty("--font-scale", String(Number(fontScale) / 100));

    if (dom.ambientSetting && document.activeElement !== dom.ambientSetting) dom.ambientSetting.checked = Boolean(ambient);
    if (dom.fontScaleSetting && document.activeElement !== dom.fontScaleSetting) dom.fontScaleSetting.value = String(fontScale);
    if (dom.fontScaleText) dom.fontScaleText.textContent = `${fontScale}%`;
    if (dom.numberFormatSetting && document.activeElement !== dom.numberFormatSetting) dom.numberFormatSetting.value = numberFormat;
    document.body.dataset.navigationMode = navigationMode;
    if (dom.navigationModeSetting && document.activeElement !== dom.navigationModeSetting) dom.navigationModeSetting.value = navigationMode;

    soundEngine.configure({ ...settings, masterVolume, effectVolume, musicVolume, musicTrack });
    if (dom.masterVolumeSetting && document.activeElement !== dom.masterVolumeSetting) dom.masterVolumeSetting.value = String(masterVolume);
    if (dom.masterVolumeText) dom.masterVolumeText.textContent = `${masterVolume}%`;
    if (dom.effectVolumeSetting && document.activeElement !== dom.effectVolumeSetting) dom.effectVolumeSetting.value = String(effectVolume);
    if (dom.effectVolumeText) dom.effectVolumeText.textContent = `${effectVolume}%`;
    if (dom.musicVolumeSetting && document.activeElement !== dom.musicVolumeSetting) dom.musicVolumeSetting.value = String(musicVolume);
    if (dom.musicVolumeText) dom.musicVolumeText.textContent = `${musicVolume}%`;
    if (dom.musicTrackSetting && document.activeElement !== dom.musicTrackSetting) dom.musicTrackSetting.value = musicTrack;
    [dom.fontScaleSetting, dom.masterVolumeSetting, dom.effectVolumeSetting, dom.musicVolumeSetting].forEach(syncRangeVisual);
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
    dom.stockNavTab.title = `Estoque ${Math.floor(usage)}% cheio`;
    document.querySelectorAll(".mobile-stock-nav-tab").forEach(tab => {
      tab.title = dom.stockNavTab.title;
      tab.setAttribute("aria-label", dom.stockNavTab.getAttribute("aria-label") || "Estoque");
      tab.style.setProperty("--stock-progress", `${usage}%`);
      tab.classList.toggle("stock-full", full);
      tab.querySelectorAll(".mobile-stock-nav-badge, .nav-alert").forEach(badge => { badge.hidden = !full; });
    });
  }

  function updateOfficeNavigation() {
    const officeNavTab = document.querySelector("#officeNavTab");
    if (!officeNavTab) return;
    officeNavTab.classList.remove("has-attention");
    officeNavTab.setAttribute("aria-label", "Escritório");
    officeNavTab.title = "Escritório";
  }

  function syncFeatureLocks() {
    const researchUnlocked = engine.isEvolutionUnlocked();
    document.querySelectorAll('[data-office-tab="evolutions"]').forEach(tab => {
      tab.disabled = false;
      tab.classList.toggle("feature-preview", !researchUnlocked);
      tab.setAttribute("aria-disabled", "false");
      tab.title = researchUnlocked
        ? "Evoluções — Centro de pesquisa"
        : `Evoluções — pesquisas liberam no nível ${GameEngine.EVOLUTION_UNLOCK_LEVEL}`;
    });

    document.querySelectorAll('[data-office-tab="contracts"]').forEach(tab => {
      tab.disabled = false;
      tab.classList.remove("feature-locked", "feature-preview");
      tab.setAttribute("aria-disabled", "false");
      tab.title = "Contratos";
    });

    const ordersUnlocked = engine.isOrdersUnlocked();
    document.querySelectorAll('[data-office-tab="orders"]').forEach(tab => {
      tab.disabled = false;
      tab.classList.toggle("feature-preview", !ordersUnlocked);
      tab.setAttribute("aria-disabled", "false");
      tab.title = ordersUnlocked
        ? "Pedidos"
        : `Pedidos — entregas liberadas no nível ${GameEngine.ORDER_UNLOCK_LEVEL}`;
    });
  }

  function updateFarmProgressDisplay() {
    const state = engine.state;
    const maximumLevel = GameEngine.MAX_FARM_LEVEL;
    const atMaximum = state.farmLevel >= maximumLevel;
    const farmNeed = engine.getFarmXPNeed();
    dom.farmLevelLabel.textContent = String(Math.min(maximumLevel, state.farmLevel));
    dom.farmProgress?.classList.toggle("max-level", atMaximum);
    dom.farmXPBar.style.width = atMaximum ? "100%" : `${percent((state.farmXP / farmNeed) * 100)}%`;
    const xpIcon = '<img class="farm-xp-inline-icon" src="assets/icons/xp.webp" alt="XP">';
    dom.farmXPText.innerHTML = atMaximum
      ? `${xpIcon}<span>${engine.formatNumber(state.farmXP)}</span>`
      : `${xpIcon}<span>${engine.formatNumber(state.farmXP)} / ${engine.formatNumber(farmNeed)}</span>`;
    if (dom.farmXPTrack) {
      dom.farmXPTrack.setAttribute("aria-valuemin", "0");
      dom.farmXPTrack.setAttribute("aria-valuemax", atMaximum ? "100" : String(farmNeed));
      dom.farmXPTrack.setAttribute("aria-valuenow", atMaximum ? "100" : String(Math.floor(state.farmXP)));
      dom.farmXPTrack.setAttribute("aria-label", atMaximum ? `Nível máximo. ${engine.formatNumber(state.farmXP)} XP.` : "Experiência da fazenda");
    }
  }

  function renderHeader() {
    syncFeatureLocks();
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
    const readyContracts = engine.isContractsUnlocked() ? engine.getReadyContractCount() : 0;
    const readyOrders = engine.isOrdersUnlocked() ? engine.getReadyOrderCount() : 0;
    const readyMissions = engine.getReadyMissionCount();
    updateOfficeNavigation();
    if (dom.contractTabCount) dom.contractTabCount.textContent = String(readyContracts);
    if (dom.contractTabCount) dom.contractTabCount.hidden = readyContracts < 1;
    if (dom.orderTabCount) dom.orderTabCount.textContent = String(readyOrders);
    if (dom.orderTabCount) dom.orderTabCount.hidden = readyOrders < 1;
    if (dom.missionTabCount) dom.missionTabCount.textContent = String(readyMissions);
    if (dom.missionTabCount) dom.missionTabCount.hidden = readyMissions < 1;
    renderContractDock();
  }

  function formatLiveTime(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    if (value < 10) return `${value.toFixed(1).replace(".", ",")}s`;
    if (value < 60) return `${Math.ceil(value)}s`;
    return engine.formatTime(value);
  }

  function updateLiveHeader(now = performance.now()) {
    if (now - lastLiveHeader < getPerformanceProfile().liveHeaderInterval) return;
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

  function rebuildLiveCropCache() {
    cropVisibilityObserver?.disconnect();
    liveCropEntries = $$('[data-live-crop]', dom.cropGrid).map(card => ({
      card,
      cropId: card.dataset.liveCrop,
      ring: $('[data-crop-ring]', card),
      progressLabel: $('[data-crop-percent]', card),
      cycle: $('[data-crop-cycle]', card),
      visible: true
    }));
    lockedCropEntries = $$('[data-locked-crop]', dom.cropGrid).map(card => ({
      card,
      cropId: card.dataset.lockedCrop,
      button: $('[data-crop-purchase]', card),
      visible: true
    }));

    if (!("IntersectionObserver" in window)) return;
    cropVisibilityObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const item = liveCropEntries.find(candidate => candidate.card === entry.target)
          || lockedCropEntries.find(candidate => candidate.card === entry.target);
        if (item) item.visible = entry.isIntersecting;
      });
    }, { rootMargin: "240px 0px" });
    [...liveCropEntries, ...lockedCropEntries].forEach(entry => cropVisibilityObserver.observe(entry.card));
  }

  function updateLiveFarmUI(now = performance.now()) {
    if (activeView !== "farmView" || now < navigationScrollActiveUntil) return;
    const storageRemaining = engine.getStorageRemaining();
    const wholesaleOverflowEnabled = engine.hasWholesaleOverflowSale();
    const activeContractCropIds = new Set(engine.state.activeContracts
      .filter(contract => contract.delivered < contract.amount && !contract.completedAt && (contract.timeRemaining > 0 || contract.defaultedAt))
      .map(contract => contract.cropId));
    const updateControls = now - lastCropControls >= getPerformanceProfile().cropControlsInterval;
    if (updateControls) lastCropControls = now;

    liveCropEntries.forEach(entry => {
      if (!entry.visible) return;
      const { card, cropId, ring, progressLabel, cycle } = entry;
      const cropState = engine.state.crops[cropId];
      if (!cropState?.owned) return;
      const growthTime = engine.getGrowthTime(cropId);
      const instant = growthTime <= 0;
      const directRoute = cropState.autoSell || activeContractCropIds.has(cropId) || wholesaleOverflowEnabled;
      const paused = storageRemaining <= 0 && !directRoute;
      const progress = instant ? 100 : percent(cropState.progress * 100);
      if (ring) {
        const previous = Number(ring.dataset.lastProgress || 0);
        const wrapped = !instant && previous > 88 && progress < 25;
        if (wrapped) ring.classList.add("progress-resetting");
        ring.style.setProperty("--growth-progress", `${progress}%`);
        if (wrapped) requestAnimationFrame(() => ring.classList.remove("progress-resetting"));
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
      lockedCropEntries.forEach(entry => {
        if (!entry.visible) return;
        const { card, cropId, button } = entry;
        const crop = engine.getCrop(cropId);
        const unlocked = engine.isCropUnlocked(cropId);
        const buyCost = engine.getBuyCost(cropId);
        const canAfford = engine.state.coins >= buyCost;
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

