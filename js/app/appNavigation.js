"use strict";
  const CATALOG_FILTER_STORAGE_KEY = "fazenda-serena-catalog-filters";
  const defaultCatalogFilterState = () => ({ categories: new Set(), hideMastered: false, hideLocked: false });

  function loadCatalogFilters() {
    const result = { farm: defaultCatalogFilterState() };
    try {
      let stored = localStorage.getItem(CATALOG_FILTER_STORAGE_KEY);
      if (!stored) {
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);
          if (key?.startsWith(`${CATALOG_FILTER_STORAGE_KEY}-`)) {
            stored = localStorage.getItem(key);
            if (stored) break;
          }
        }
      }
      const raw = JSON.parse(stored || "null");
      ["farm"].forEach(context => {
        if (!raw?.[context]) return;
        result[context].categories = new Set(Array.isArray(raw[context].categories) ? raw[context].categories.map(String) : []);
        result[context].hideMastered = Boolean(raw[context].hideMastered);
        result[context].hideLocked = Boolean(raw[context].hideLocked);
      });
    } catch (_) {}
    return result;
  }

  const catalogFilters = loadCatalogFilters();
  let catalogFilterContext = "farm";

  function saveCatalogFilters() {
    try {
      localStorage.setItem(CATALOG_FILTER_STORAGE_KEY, JSON.stringify({
        farm: { ...catalogFilters.farm, categories: [...catalogFilters.farm.categories] }
      }));
    } catch (_) {}
  }

  function catalogFilterCount(context) {
    const state = catalogFilters[context] || catalogFilters.farm;
    return Number(state.hideMastered) + Number(context === "farm" && state.hideLocked) + Number(state.categories.size > 0);
  }

  function syncCatalogFilterButtons() {
    [["farm", dom.farmFilterButton, dom.farmFilterCount]].forEach(([context, button, badge]) => {
      const count = catalogFilterCount(context);
      button?.classList.toggle("has-active-filters", count > 0);
      button?.setAttribute("aria-label", count ? `Filtros, ${count} ${count === 1 ? "filtro ativo" : "filtros ativos"}` : "Filtros");
      if (badge) { badge.textContent = String(count); badge.hidden = count === 0; }
    });
  }

  function setupCategoryFilter() {
    const validCategories = new Set(Object.keys(engine.data.categories || {}));
    ["farm"].forEach(context => {
      catalogFilters[context].categories = new Set([...catalogFilters[context].categories].filter(id => validCategories.has(id)));
    });
    saveCatalogFilters();
    syncCatalogFilterButtons();
  }

  function renderCatalogFilterDialog(context) {
    catalogFilterContext = "farm";
    const state = catalogFilters[catalogFilterContext];
    if (dom.catalogFilterTitle) dom.catalogFilterTitle.textContent = "Filtros da Fazenda";
    if (dom.catalogFilterHideMastered) dom.catalogFilterHideMastered.checked = state.hideMastered;
    if (dom.catalogFilterHideLocked) dom.catalogFilterHideLocked.checked = state.hideLocked;
    if (dom.catalogFilterLockedRow) dom.catalogFilterLockedRow.hidden = catalogFilterContext !== "farm";
    if (dom.catalogFilterCategoryGrid) {
      dom.catalogFilterCategoryGrid.innerHTML = Object.entries(engine.data.categories || {}).map(([id, name]) => `
        <label class="catalog-filter-category"><input type="checkbox" value="${escapeHtml(id)}" ${state.categories.has(id) ? "checked" : ""}><span>${escapeHtml(name)}</span><i aria-hidden="true">✓</i></label>`).join("");
    }
  }

  function openCatalogFilterDialog(context) {
    if (!dom.catalogFilterDialog) return;
    renderCatalogFilterDialog(context);
    if (typeof dom.catalogFilterDialog.showModal === "function" && !dom.catalogFilterDialog.open) dom.catalogFilterDialog.showModal();
  }

  function applyCatalogFilterDialog() {
    const state = catalogFilters[catalogFilterContext];
    if (!state) return;
    state.hideMastered = Boolean(dom.catalogFilterHideMastered?.checked);
    state.hideLocked = catalogFilterContext === "farm" && Boolean(dom.catalogFilterHideLocked?.checked);
    state.categories = new Set($$("#catalogFilterCategoryGrid input[type=checkbox]:checked").map(input => input.value));
    saveCatalogFilters();
    syncCatalogFilterButtons();
    dom.catalogFilterDialog?.close("applied");
    renderCrops();
  }

  function resetCatalogFilterDraft() {
    const key = "farm";
    catalogFilters[key] = defaultCatalogFilterState();
    saveCatalogFilters();
    syncCatalogFilterButtons();
    if (dom.catalogFilterHideMastered) dom.catalogFilterHideMastered.checked = false;
    if (dom.catalogFilterHideLocked) dom.catalogFilterHideLocked.checked = false;
    $$("#catalogFilterCategoryGrid input[type=checkbox]").forEach(input => { input.checked = false; });
    dom.catalogFilterDialog?.close("cleared");
    renderCrops();
  }

  function clearCatalogFilters(context) {
    const key = "farm";
    catalogFilters[key] = defaultCatalogFilterState();
    saveCatalogFilters();
    syncCatalogFilterButtons();
    if (dom.catalogFilterDialog?.open && catalogFilterContext === key) renderCatalogFilterDialog(key);
    renderCrops();
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

  function updateRouteQuery() {
    const url = new URL(window.location.href);
    url.hash = "";
    url.searchParams.set("view", activeView);
    if (activeView === "officeView") url.searchParams.set("office", activeOfficeTab); else url.searchParams.delete("office");
    if (activeView === "profileView") url.searchParams.set("profile", activeProfileTab); else url.searchParams.delete("profile");
    history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  function showView(viewId, updateRoute = true) {
    const requestedView = dom.views.some(view => view.id === viewId) ? viewId : "farmView";
    activeView = requestedView;
    if (requestedView === "farmView") cropUpgradeModes.clear();
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
    if (updateRoute) updateRouteQuery();
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
    const appearanceMode = ["automatic", "light", "dark"].includes(settings.appearanceMode) ? settings.appearanceMode : "automatic";
    const effectiveTheme = window.FazendaSerenaTheme?.resolveTheme
      ? window.FazendaSerenaTheme.resolveTheme(appearanceMode)
      : (appearanceMode === "automatic" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : appearanceMode === "automatic" ? "light" : appearanceMode);
    const signature = JSON.stringify({ ambient: Boolean(ambient), fontScale, numberFormat, navigationMode, appearanceMode, effectiveTheme, masterVolume, effectVolume, musicVolume, musicTrack });
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
    if (window.FazendaSerenaTheme?.apply) {
      window.FazendaSerenaTheme.apply(appearanceMode, { persist: true });
    } else {
      document.documentElement.dataset.themeMode = appearanceMode;
      document.documentElement.dataset.theme = effectiveTheme;
      document.body.dataset.theme = effectiveTheme;
      document.documentElement.style.colorScheme = effectiveTheme;
      const themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) themeColor.setAttribute("content", effectiveTheme === "dark" ? "#0b100d" : "#eef4e8");
      try { localStorage.setItem("fazenda-serena-theme-mode", appearanceMode); } catch {}
    }
    if (dom.appearanceModeSetting && document.activeElement !== dom.appearanceModeSetting) dom.appearanceModeSetting.value = appearanceMode;

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


  function syncFeatureLocks() {
    const runtime = window.FazendaSerenaRuntimeConfig || {};
    const iconFor = key => runtime.navigationIcons?.[key] || ({ evolutions: "assets/icons/livros.webp" })[key] || "assets/icons/cadeado.webp";
    const sync = (selector, key, unlocked, label, level) => {
      document.querySelectorAll(selector).forEach(tab => {
        tab.disabled = false; // a prévia continua acessível; somente as ações ficam bloqueadas no painel.
        const preview = !unlocked;
        if (tab.classList.contains("feature-preview") !== preview) tab.classList.toggle("feature-preview", preview);
        const lockedValue = String(preview);
        if (tab.dataset.featureLocked !== lockedValue) tab.dataset.featureLocked = lockedValue;
        const title = unlocked ? label : `${label} · libera no nível ${level}`;
        if (tab.title !== title) tab.title = title;
        const image = tab.querySelector("img");
        const source = unlocked ? iconFor(key) : "assets/icons/cadeado.webp";
        // Nunca reatribui src sem necessidade: isso evita piscar/redecodificar
        // ícones da navegação em renders estruturais disparados por ações.
        if (image && image.getAttribute("src") !== source) image.src = source;
      });
    };
    sync('[data-office-tab="evolutions"]', "evolutions", engine.isEvolutionUnlocked(), "Evoluções", GameEngine.EVOLUTION_UNLOCK_LEVEL);
  }

  const farmXPBorderObservers = new WeakMap();

  function syncFarmXPBorderGeometry(counter) {
    if (!counter) return;
    const svg = counter.querySelector(".farm-xp-border");
    const track = svg?.querySelector(".farm-xp-track-stroke");
    const progressPath = svg?.querySelector(".farm-xp-progress-stroke");
    if (!svg || !track || !progressPath) return;
    if (!farmXPBorderObservers.has(counter) && typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => syncFarmXPBorderGeometry(counter));
      observer.observe(counter);
      farmXPBorderObservers.set(counter, observer);
    }
    const rect = counter.getBoundingClientRect();
    const width = Math.max(0, rect.width);
    const height = Math.max(0, rect.height);
    if (width < 8 || height < 8) return;
    const inset = 2;
    const computedRadius = parseFloat(getComputedStyle(counter).borderTopLeftRadius) || 12;
    const radius = Math.max(0, Math.min(computedRadius, (height - inset * 2) / 2, (width - inset * 2) / 2));
    const left = inset;
    const top = inset;
    const right = width - inset;
    const bottom = height - inset;
    const centerY = height / 2;
    const d = [
      `M ${left} ${centerY}`,
      `V ${top + radius}`,
      `Q ${left} ${top} ${left + radius} ${top}`,
      `H ${right - radius}`,
      `Q ${right} ${top} ${right} ${top + radius}`,
      `V ${bottom - radius}`,
      `Q ${right} ${bottom} ${right - radius} ${bottom}`,
      `H ${left + radius}`,
      `Q ${left} ${bottom} ${left} ${bottom - radius}`,
      `V ${centerY}`,
      "Z"
    ].join(" " );
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    track.setAttribute("d", d);
    progressPath.setAttribute("d", d);
  }

  function updateFarmProgressDisplay() {
    const state = engine.state;
    const maximumLevel = GameEngine.MAX_FARM_LEVEL;
    const atMaximum = state.farmLevel >= maximumLevel;
    const farmNeed = Math.max(1, engine.getFarmXPNeed());
    const levelText = String(Math.min(maximumLevel, state.farmLevel));
    const progress = atMaximum ? 100 : percent((state.farmXP / farmNeed) * 100);
    const progressText = `${progress}%`;
    const xpText = atMaximum
      ? engine.formatNumber(state.farmXP)
      : `${engine.formatNumber(state.farmXP)} / ${engine.formatNumber(farmNeed)}`;

    const levelValues = [
      dom.farmXPText?.querySelector?.("[data-farm-level-value]"),
      dom.floatingFarmXPResource?.querySelector?.("[data-farm-level-value]")
    ];
    levelValues.forEach(value => { if (value && value.textContent !== levelText) value.textContent = levelText; });

    [dom.farmXPResource, dom.floatingFarmXPResource].forEach(counter => {
      if (!counter) return;
      syncFarmXPBorderGeometry(counter);
      const nextLevel = Number(levelText) || 1;
      const previousLevel = Number(counter.dataset.farmXpLevel || nextLevel) || nextLevel;
      const dashOffset = String(Math.max(0, Math.min(100, 100 - progress)));
      if (previousLevel !== nextLevel) {
        counter.classList.add("xp-ring-resetting");
        counter.style.setProperty("--farm-xp-progress", progressText);
        counter.style.setProperty("--farm-xp-dashoffset", dashOffset);
        counter.dataset.farmXpLevel = String(nextLevel);
        void counter.offsetWidth;
        window.requestAnimationFrame(() => counter.classList.remove("xp-ring-resetting"));
      } else {
        counter.dataset.farmXpLevel = String(nextLevel);
        counter.style.setProperty("--farm-xp-progress", progressText);
        counter.style.setProperty("--farm-xp-dashoffset", dashOffset);
      }
      counter.classList.toggle("max-level", atMaximum);
      counter.setAttribute("aria-valuemin", "0");
      counter.setAttribute("aria-valuemax", atMaximum ? "100" : String(farmNeed));
      counter.setAttribute("aria-valuenow", atMaximum ? "100" : String(Math.floor(state.farmXP)));
      counter.setAttribute("aria-label", atMaximum ? `XP da fazenda: nível máximo, ${engine.formatNumber(state.farmXP)} XP.` : `XP da fazenda: nível ${levelText}, ${xpText}.`);
      counter.title = atMaximum ? `Nível máximo · ${engine.formatNumber(state.farmXP)} XP` : `Nível ${levelText} · ${xpText} XP`;
    });
  }

  function renderHeader() {
    syncFeatureLocks();
    const state = engine.state;
    const coinsText = engine.formatNumber(state.coins);
    const researchText = engine.formatNumber(state.research);
    const prestigeText = engine.formatNumber(state.prestigePoints);
    if (dom.coinsCounter?.textContent !== coinsText) dom.coinsCounter.textContent = coinsText;
    if (dom.researchCounter?.textContent !== researchText) dom.researchCounter.textContent = researchText;
    if (dom.prestigeCounter?.textContent !== prestigeText) dom.prestigeCounter.textContent = prestigeText;
    if (dom.floatingCoinsCounter?.textContent !== coinsText) dom.floatingCoinsCounter.textContent = coinsText;
    if (dom.floatingResearchCounter?.textContent !== researchText) dom.floatingResearchCounter.textContent = researchText;
    if (dom.floatingPrestigeCounter?.textContent !== prestigeText) dom.floatingPrestigeCounter.textContent = prestigeText;
    updateFarmProgressDisplay();

    const metrics = engine.getMetrics();
    const readyContracts = engine.isContractsUnlocked() ? engine.getReadyContractCount() : 0;
    const readyMissions = engine.getReadyMissionCount();
    setNavigationAttention("contracts", readyContracts > 0);
    setNavigationAttention("profile", readyMissions > 0);
  }

  function formatLiveTime(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    if (value < 10) return `${value.toFixed(1).replace(".", ",")}s`;
    if (value < 60) return `${Math.ceil(value)}s`;
    return engine.formatTime(value);
  }

  function updateLiveHeader(now = performance.now(), force = false) {
    if (!force && now - lastLiveHeader < getPerformanceProfile().liveHeaderInterval) return;
    lastLiveHeader = now;
    const state = engine.state;
    const coinsText = engine.formatNumber(state.coins);
    const researchText = engine.formatNumber(state.research);
    const prestigeText = engine.formatNumber(state.prestigePoints);
    if (dom.coinsCounter?.textContent !== coinsText) dom.coinsCounter.textContent = coinsText;
    if (dom.researchCounter?.textContent !== researchText) dom.researchCounter.textContent = researchText;
    if (dom.prestigeCounter?.textContent !== prestigeText) dom.prestigeCounter.textContent = prestigeText;
    if (dom.floatingCoinsCounter && dom.floatingCoinsCounter.textContent !== coinsText) dom.floatingCoinsCounter.textContent = coinsText;
    if (dom.floatingResearchCounter && dom.floatingResearchCounter.textContent !== researchText) dom.floatingResearchCounter.textContent = researchText;
    if (dom.floatingPrestigeCounter && dom.floatingPrestigeCounter.textContent !== prestigeText) dom.floatingPrestigeCounter.textContent = prestigeText;
    updateFarmProgressDisplay();
  }

  function rebuildLiveCropCache() {
    cropVisibilityObserver?.disconnect();
    liveCropEntries = $$('[data-live-crop]', dom.cropGrid).map(card => ({
      card,
      cropId: card.dataset.liveCrop,
      loader: $('[data-crop-loader]', card),
      progressCircle: $('[data-crop-progress-circle]', card),
      progressLabel: $('[data-crop-percent]', card),
      progressText: $('[data-crop-percent-text]', card),
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
    const updateControls = now - lastCropControls >= getPerformanceProfile().cropControlsInterval;
    if (updateControls) lastCropControls = now;

    liveCropEntries.forEach(entry => {
      if (!entry.visible) return;
      const { card, cropId, loader, progressCircle, progressLabel, progressText, cycle } = entry;
      const cropState = engine.state.crops[cropId];
      if (!cropState?.owned) return;
      const growthTime = engine.getGrowthTime(cropId);
      const instant = growthTime <= 0;
      const optimizedLoader = instant || growthTime < 1;
      const progress = optimizedLoader ? 100 : percent(cropState.progress * 100);

      if (loader && progressCircle) {
        const previous = Number(loader.dataset.lastProgress || 0);
        const progressValue = String(progress);
        if (loader.dataset.lastProgress !== progressValue) {
          const wrapped = !optimizedLoader && previous > 88 && progress < 25;
          if (wrapped) {
            loader.classList.add("is-resetting");
            // Força o navegador a aplicar o estado sem transição antes de voltar
            // o círculo ao início do próximo ciclo.
            void progressCircle.getBoundingClientRect();
          }
          progressCircle.style.strokeDashoffset = String(100 - progress);
          loader.dataset.lastProgress = progressValue;
          if (wrapped) requestAnimationFrame(() => loader.classList.remove("is-resetting"));
        }

        const loaderState = optimizedLoader ? "static" : "running";
        if (loader.dataset.liveState !== loaderState) {
          loader.dataset.liveState = loaderState;
          loader.classList.toggle("is-static", optimizedLoader);
          if (optimizedLoader) progressCircle.style.strokeDashoffset = "0";
        }
      }

      if (progressLabel && progressText) {
        if (progressLabel.hidden !== optimizedLoader) progressLabel.hidden = optimizedLoader;
        if (!optimizedLoader) {
          const label = `${Math.floor(progress)}%`;
          if (progressText.textContent !== label) progressText.textContent = label;
        }
      }

      if (cycle) {
        const cycleText = instant ? "Contínua" : formatLiveTime((1 - cropState.progress) * growthTime);
        if (cycle.textContent !== cycleText) cycle.textContent = cycleText;
      }

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
        const insufficient = unlocked && !canAfford;
        if (card.classList.contains("insufficient") !== insufficient) card.classList.toggle("insufficient", insufficient);
        if (button) {
          // Conteúdo e imagem são estruturais; no loop muda só a disponibilidade.
          const disabled = !unlocked || !canAfford;
          if (button.disabled !== disabled) button.disabled = disabled;
        }
      });
    }
  }

